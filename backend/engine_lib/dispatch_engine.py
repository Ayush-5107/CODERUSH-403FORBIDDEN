"""
Dispatch Engine & Resource Orchestrator.
Handles priority queues, dynamic resource allocation (ambulances, beds, medicines),
and multi-criteria hospital evaluation.
"""

import heapq
import time
from typing import List, Dict, Tuple, Optional, Any
from models import (
    EmergencyRequest, Hospital, Ambulance, AmbulanceStatus,
    DispatchPlan, EvaluationBreadcrumb, UrgencyLevel, MedicalSpecialty
)
from graph_engine import RuralRoadGraph


class PriorityQueueRequest:
    """
    Wrapper for EmergencyRequest to enable Min-Heap Priority Queue sorting.
    Higher urgency (Tier 1 < Tier 2 < Tier 3) and earlier timestamp come first.
    """
    def __init__(self, request: EmergencyRequest):
        self.request = request

    def __lt__(self, other: 'PriorityQueueRequest') -> bool:
        # Tier 1 (val=1) has priority over Tier 2 (val=2)
        if self.request.urgency.value != other.request.urgency.value:
            return self.request.urgency.value < other.request.urgency.value
        # Tie-breaker: earlier timestamp gets priority
        return self.request.timestamp < other.request.timestamp


class DispatchOrchestrator:
    """
    Core Dispatching Engine that orchestrates ambulance fleet routing,
    hospital resource checking, and priority queue handling.
    """

    def __init__(self, graph: RuralRoadGraph, hospitals: List[Hospital], ambulances: List[Ambulance]):
        self.graph = graph
        self.hospitals: Dict[str, Hospital] = {h.id: h for h in hospitals}
        self.ambulances: Dict[str, Ambulance] = {a.id: a for a in ambulances}
        
        # Priority Queue for unassigned emergency requests
        self.request_queue: List[PriorityQueueRequest] = []
        self.dispatch_history: List[DispatchPlan] = []

    def submit_request(self, request: EmergencyRequest) -> None:
        """Enqueue an emergency patient request into the Min-Heap Priority Queue."""
        heapq.heappush(self.request_queue, PriorityQueueRequest(request))

    def evaluate_and_dispatch_next(self) -> Optional[DispatchPlan]:
        """
        Pulls highest priority emergency request from queue and evaluates all hospitals & ambulances.
        Generates an optimal dispatch plan and decision audit breadcrumbs.
        """
        if not self.request_queue:
            return None

        pq_item = heapq.heappop(self.request_queue)
        request = pq_item.request

        res = self.compute_optimal_dispatch(request)
        if isinstance(res, DispatchPlan):
            plan = res
            # Execute resource reservation
            target_hospital = self.hospitals[plan.target_hospital_id]
            assigned_ambulance = self.ambulances[plan.assigned_ambulance_id]

            # 1. Reserve 1 Bed at Hospital
            target_hospital.available_beds = max(0, target_hospital.available_beds - 1)
            target_hospital.current_queue_length += 1

            # 2. Deduct Medicine Stock
            for med, qty in request.required_medicines.items():
                if med in target_hospital.medicine_inventory:
                    target_hospital.medicine_inventory[med] = max(0, target_hospital.medicine_inventory[med] - qty)

            # 3. Update Ambulance Status
            assigned_ambulance.status = AmbulanceStatus.EN_ROUTE_PICKUP
            assigned_ambulance.assigned_request_id = request.id

            self.dispatch_history.append(plan)
            return (plan, [])
        else:
            breadcrumbs = res if isinstance(res, list) else []
            # Re-queue request if no resources available right now
            heapq.heappush(self.request_queue, pq_item)
            return (None, breadcrumbs)

    def compute_optimal_dispatch(self, request: EmergencyRequest) -> Optional[DispatchPlan]:
        """
        Evaluates candidate hospitals and available ambulances against multi-criteria constraints:
        1. Required medical specialty availability (e.g. Cardiology).
        2. Hospital bed capacity.
        3. Medicine inventory sufficiency.
        4. Minimum total travel & queue cost.
        """
        breadcrumbs: List[EvaluationBreadcrumb] = []
        best_plan_candidates: List[Tuple[float, Dict[str, Any]]] = []

        # Find all available IDLE ambulances
        available_ambulances = [a for a in self.ambulances.values() if a.status == AmbulanceStatus.IDLE]
        
        # Edge Case 3: If no local ambulance is completely IDLE, fall back to any available ambulance or queued dispatch
        if not available_ambulances:
            # Fallback: Treat all ambulances as candidate if servicing, or find closest depot base
            available_ambulances = list(self.ambulances.values())

        for hospital in self.hospitals.values():
            rejection_reasons = []

            # Constraint Check 1: Specialist Availability
            if request.required_specialty not in hospital.specialists:
                rejection_reasons.append(
                    f"Lacks required specialist ({request.required_specialty.value}). Available: {[s.value for s in hospital.specialists]}"
                )

            # Constraint Check 2: Available Bed Capacity
            if hospital.available_beds <= 0:
                rejection_reasons.append(f"No available beds (Capacity: {hospital.total_beds}/{hospital.total_beds} occupied)")

            # Constraint Check 3: Required Medicine Inventory
            for med, qty in request.required_medicines.items():
                in_stock = hospital.medicine_inventory.get(med, 0)
                if in_stock < qty:
                    rejection_reasons.append(f"Insufficient stock for medicine '{med}' (Required: {qty}, In-Stock: {in_stock})")

            # Route from Patient Village to Hospital using Dijkstra / A*
            delivery_time_mins, delivery_path = self.graph.dijkstra(request.village_node_id, hospital.node_id)
            
            # Edge Case 1: No Direct Road available / Road blocked
            if delivery_time_mins == float('inf'):
                rejection_reasons.append("No viable road network path found from village to hospital (Roads blocked/impassable)")

            dist_km = self.graph.calculate_path_distance_km(delivery_path) if delivery_path else 0.0

            # Find best ambulance for this hospital candidate
            best_ambulance: Optional[Ambulance] = None
            min_pickup_time_mins = float('inf')
            best_pickup_path: List[str] = []

            for amb in available_ambulances:
                pickup_time_mins, pickup_path = self.graph.dijkstra(amb.current_node_id, request.village_node_id)
                if pickup_time_mins < min_pickup_time_mins:
                    min_pickup_time_mins = pickup_time_mins
                    best_ambulance = amb
                    best_pickup_path = pickup_path

            if not best_ambulance or min_pickup_time_mins == float('inf'):
                rejection_reasons.append("No reachable ambulance available for pickup")

            # Hospital Queue Delay Time
            queue_delay_mins = hospital.current_queue_length * hospital.avg_treatment_time_mins

            total_cost_mins = min_pickup_time_mins + delivery_time_mins + queue_delay_mins

            if rejection_reasons:
                breadcrumb = EvaluationBreadcrumb(
                    hospital_id=hospital.id,
                    hospital_name=hospital.name,
                    distance_km=dist_km,
                    pickup_time_mins=round(min_pickup_time_mins, 2) if min_pickup_time_mins != float('inf') else 0.0,
                    hospital_travel_time_mins=round(delivery_time_mins, 2) if delivery_time_mins != float('inf') else 0.0,
                    hospital_queue_delay_mins=round(queue_delay_mins, 2),
                    total_cost_mins=round(total_cost_mins, 2) if total_cost_mins != float('inf') else 999.0,
                    status="REJECTED",
                    rejection_reasons=rejection_reasons
                )
                breadcrumbs.append(breadcrumb)
            else:
                breadcrumb = EvaluationBreadcrumb(
                    hospital_id=hospital.id,
                    hospital_name=hospital.name,
                    distance_km=dist_km,
                    pickup_time_mins=round(min_pickup_time_mins, 2),
                    hospital_travel_time_mins=round(delivery_time_mins, 2),
                    hospital_queue_delay_mins=round(queue_delay_mins, 2),
                    total_cost_mins=round(total_cost_mins, 2),
                    status="APPROVED",
                    rejection_reasons=[]
                )
                breadcrumbs.append(breadcrumb)
                
                best_plan_candidates.append((
                    total_cost_mins,
                    {
                        "hospital": hospital,
                        "ambulance": best_ambulance,
                        "pickup_path": best_pickup_path,
                        "delivery_path": delivery_path,
                        "pickup_time": min_pickup_time_mins,
                        "delivery_time": delivery_time_mins,
                        "queue_delay": queue_delay_mins
                    }
                ))

        if not best_plan_candidates:
            return breadcrumbs

        # Sort candidate solutions by total operational cost (Travel + Queue)
        best_plan_candidates.sort(key=lambda x: x[0])
        _, selected = best_plan_candidates[0]

        hospital = selected["hospital"]
        ambulance = selected["ambulance"]
        pickup_path = selected["pickup_path"]
        delivery_path = selected["delivery_path"]

        return DispatchPlan(
            request_id=request.id,
            patient_village_id=request.village_node_id,
            target_hospital_id=hospital.id,
            target_hospital_name=hospital.name,
            assigned_ambulance_id=ambulance.id,
            pickup_path_nodes=pickup_path,
            delivery_path_nodes=delivery_path,
            pickup_time_mins=round(selected["pickup_time"], 2),
            delivery_time_mins=round(selected["delivery_time"], 2),
            hospital_queue_delay_mins=round(selected["queue_delay"], 2),
            total_trip_mins=round(selected["pickup_time"] + selected["delivery_time"] + selected["queue_delay"], 2),
            evaluation_logs=breadcrumbs,
            geojson_pickup_route=self.graph.get_coordinates_path(pickup_path),
            geojson_delivery_route=self.graph.get_coordinates_path(delivery_path)
        )
