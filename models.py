"""
Data Models and Enums for the Rural Healthcare Routing & Dispatch Engine.
Designed with Pydantic v2 for robust validation and seamless JSON serialization.
"""

from enum import Enum
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class NodeType(str, Enum):
    VILLAGE = "VILLAGE"
    HOSPITAL = "HOSPITAL"
    AMBULANCE_BASE = "AMBULANCE_BASE"
    JUNCTION = "JUNCTION"


class UrgencyLevel(int, Enum):
    TIER_1_CRITICAL = 1  # Cardiac arrest, stroke, severe hemorrhaging (Highest Priority)
    TIER_2_URGENT = 2    # Severe asthma, fracture, high fever
    TIER_3_MODERATE = 3  # Stable condition, minor injuries


class MedicalSpecialty(str, Enum):
    CARDIOLOGY = "CARDIOLOGY"
    TRAUMA = "TRAUMA"
    NEUROLOGY = "NEUROLOGY"
    PLASTIC_SURGERY = "PLASTIC_SURGERY"
    PEDIATRICS = "PEDIATRICS"
    GENERAL_SURGERY = "GENERAL_SURGERY"


class AmbulanceStatus(str, Enum):
    IDLE = "IDLE"
    EN_ROUTE_PICKUP = "EN_ROUTE_PICKUP"
    EN_ROUTE_HOSPITAL = "EN_ROUTE_HOSPITAL"
    SERVICING = "SERVICING"


class GraphNode(BaseModel):
    id: str
    name: str
    type: NodeType
    lat: float
    lng: float


class GraphEdge(BaseModel):
    u: str
    v: str
    distance_km: float
    speed_limit_kmh: float = 60.0
    traffic_factor: float = 1.0       # 1.0 = clear, 2.0 = heavy congestion, 3.0 = gridlock
    road_condition_factor: float = 1.0 # 1.0 = paved smooth, 1.5 = unpaved/dirt, 2.5 = flooded/damaged
    is_blocked: bool = False

    @property
    def travel_time_minutes(self) -> float:
        """Calculate dynamic travel time in minutes taking traffic & road condition into account."""
        if self.is_blocked:
            return float('inf')
        effective_speed = max(5.0, self.speed_limit_kmh / (self.traffic_factor * self.road_condition_factor))
        return (self.distance_km / effective_speed) * 60.0


class Hospital(BaseModel):
    id: str
    name: str
    node_id: str
    specialists: List[MedicalSpecialty]
    total_beds: int
    available_beds: int
    medicine_inventory: Dict[str, int] = Field(default_factory=dict)
    current_queue_length: int = 0
    avg_treatment_time_mins: float = 15.0


class Ambulance(BaseModel):
    id: str
    name: str
    base_node_id: str
    current_node_id: str
    status: AmbulanceStatus = AmbulanceStatus.IDLE
    assigned_request_id: Optional[str] = None
    speed_kmh: float = 60.0
    lat: float
    lng: float


class EmergencyRequest(BaseModel):
    id: str
    village_node_id: str
    patient_name: str
    condition_description: str
    urgency: UrgencyLevel
    required_specialty: MedicalSpecialty
    required_medicines: Dict[str, int] = Field(default_factory=dict)
    timestamp: float = 0.0


class EvaluationBreadcrumb(BaseModel):
    hospital_id: str
    hospital_name: str
    distance_km: float
    pickup_time_mins: float
    hospital_travel_time_mins: float
    hospital_queue_delay_mins: float
    total_cost_mins: float
    status: str  # "APPROVED" or "REJECTED"
    rejection_reasons: List[str] = Field(default_factory=list)


class DispatchPlan(BaseModel):
    request_id: str
    patient_village_id: str
    target_hospital_id: str
    target_hospital_name: str
    assigned_ambulance_id: str
    pickup_path_nodes: List[str]
    delivery_path_nodes: List[str]
    pickup_time_mins: float
    delivery_time_mins: float
    hospital_queue_delay_mins: float
    total_trip_mins: float
    evaluation_logs: List[EvaluationBreadcrumb]
    geojson_pickup_route: List[List[float]]   # Coordinates [[lat, lng], ...]
    geojson_delivery_route: List[List[float]] # Coordinates [[lat, lng], ...]


class SimulationState(BaseModel):
    active_requests: List[EmergencyRequest]
    dispatched_plans: List[DispatchPlan]
    hospitals: List[Hospital]
    ambulances: List[Ambulance]
    decision_logs: List[Dict[str, Any]]
