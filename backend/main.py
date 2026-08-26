"""
main.py — FastAPI server for Rural Healthcare Dispatch.

Uses engine_lib.DispatchOrchestrator (Priority-Queue + A*/Dijkstra routing)
instead of the simple haversine fallback.

Endpoints:
  GET  /resources/snapshot        → ResourceSnapshotShape
  POST /requests                  → creates & immediately dispatches
  GET  /requests/{id}/result      → DispatchResultShape
  WS   /ws                        → bidirectional JSON event stream

WebSocket events the server pushes:
  { type: "request:new",      payload: EmergencyRequestShape }
  { type: "dispatch:result",  payload: DispatchResultShape   }
  { type: "resources:update", payload: ResourceSnapshotShape }
"""
import asyncio
import json
import random
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
import sys, os
_backend_dir = os.path.dirname(os.path.abspath(__file__))
_root_dir = os.path.dirname(_backend_dir)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)
if os.path.join(_backend_dir, "engine_lib") not in sys.path:
    sys.path.insert(0, os.path.join(_backend_dir, "engine_lib"))


import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Engine imports ────────────────────────────────────────────────────────────
try:
    from engine_lib.models import EmergencyRequest, UrgencyLevel, AmbulanceStatus
    from engine_lib.dispatch_engine import DispatchOrchestrator
except ModuleNotFoundError:
    try:
        from models import EmergencyRequest, UrgencyLevel, AmbulanceStatus
        from dispatch_engine import DispatchOrchestrator
    except ModuleNotFoundError:
        from .engine_lib.models import EmergencyRequest, UrgencyLevel, AmbulanceStatus
        from .engine_lib.dispatch_engine import DispatchOrchestrator


from world_graph import build_world, SPECIALTY_MAP

# ── Build the world once at startup ──────────────────────────────────────────
_graph, _hospitals_list, _ambulances_list = build_world()
orchestrator = DispatchOrchestrator(_graph, _hospitals_list, _ambulances_list)


# ── Helpers: serialise engine objects → frontend-compatible dicts ─────────────
def _ambulance_to_dict(amb) -> dict:
    return {
        "id":     amb.id,
        "name":   amb.name,
        "status": "available" if amb.status == AmbulanceStatus.IDLE else "en_route",
        "lat":    amb.lat,
        "lng":    amb.lng,
    }

def _hospital_to_dict(h) -> dict:
    return {
        "id":             h.id,
        "name":           h.name,
        "lat":            _graph.nodes[h.node_id].lat,
        "lng":            _graph.nodes[h.node_id].lng,
        "specialties":    [s.value.lower() for s in h.specialists],
        "bedsAvailable":  h.available_beds,
        "totalBeds":      h.total_beds,
        "queueLength":    h.current_queue_length,
    }

def _snapshot() -> dict:
    return {
        "ambulances": [_ambulance_to_dict(a) for a in orchestrator.ambulances.values()],
        "hospitals":  [_hospital_to_dict(h)  for h in orchestrator.hospitals.values()],
        "medicineStock": _build_medicine_stock(),
    }

def _build_medicine_stock() -> list:
    stock = []
    for h in orchestrator.hospitals.values():
        for drug, qty in h.medicine_inventory.items():
            stock.append({"hospitalId": h.id, "drug": drug.lower(), "unitsRemaining": qty})
    return stock

def _plan_to_result(plan, request_dict: dict) -> dict:
    """Convert DispatchPlan → DispatchResultShape the frontend expects."""
    # Convert [[lat, lng], ...] → [[lng, lat], ...] for MapLibre
    def to_lnglat(coords):
        return [[lng, lat] for lat, lng in coords]

    pickup_coords   = to_lnglat(plan.geojson_pickup_route)
    delivery_coords = to_lnglat(plan.geojson_delivery_route)
    full_route      = pickup_coords + delivery_coords[1:]  # stitch; skip duplicate patient node

    ambo = orchestrator.ambulances[plan.assigned_ambulance_id]

    return {
        "requestId":          plan.request_id,
        "ambulanceId":        plan.assigned_ambulance_id,
        "hospitalId":         plan.target_hospital_id,
        "hospitalName":       plan.target_hospital_name,
        "routeCoordinates":   full_route,          # [[lng, lat], ...] for the map
        "pickupRoute":        pickup_coords,        # ambulance → patient segment
        "deliveryRoute":      delivery_coords,      # patient → hospital segment
        "route": {
            # Legacy keys the frontend map still reads
            "ambulanceId": plan.assigned_ambulance_id,
            "patientLat":  request_dict["lat"],
            "patientLng":  request_dict["lng"],
            "hospitalId":  plan.target_hospital_id,
        },
        "travelTimeMinutes":   round(plan.total_trip_mins),
        "pickupTimeMinutes":   round(plan.pickup_time_mins),
        "deliveryTimeMinutes": round(plan.delivery_time_mins),
        "queueDelayMinutes":   round(plan.hospital_queue_delay_mins),
        "waitTimeMinutes":     round(plan.hospital_queue_delay_mins),
        "totalCost":           round(plan.total_trip_mins),
        "feasible":            True,
        "fallbackReason":      None,
        # Rich decision log with per-hospital breadcrumbs
        "decisionLog": [
            f"[{bc.status}] {bc.hospital_name}: "
            f"pickup={bc.pickup_time_mins:.1f}min, travel={bc.hospital_travel_time_mins:.1f}min, "
            f"queue={bc.hospital_queue_delay_mins:.1f}min, total={bc.total_cost_mins:.1f}min"
            + (f" — REJECTED: {'; '.join(bc.rejection_reasons)}" if bc.rejection_reasons else "")
            for bc in plan.evaluation_logs
        ],
        "evaluationBreadcrumbs": [bc.model_dump() for bc in plan.evaluation_logs],
    }


def _unfulfillable(request_id: str, log: list[str], reason: str, breadcrumbs: list = None) -> dict:
    breadcrumbs_list = breadcrumbs or []
    if breadcrumbs_list and not log:
        log = [
            f"[{bc.status}] {bc.hospital_name}: "
            f"pickup={bc.pickup_time_mins:.1f}min, travel={bc.hospital_travel_time_mins:.1f}min, "
            f"queue={bc.hospital_queue_delay_mins:.1f}min"
            + (f" — REJECTED: {'; '.join(bc.rejection_reasons)}" if bc.rejection_reasons else "")
            for bc in breadcrumbs_list
        ]
    return {
        "requestId":          request_id,
        "ambulanceId":        None,
        "hospitalId":         None,
        "hospitalName":       None,
        "routeCoordinates":   [],
        "pickupRoute":        [],
        "deliveryRoute":      [],
        "route":              None,
        "travelTimeMinutes":  0,
        "pickupTimeMinutes":  0,
        "deliveryTimeMinutes": 0,
        "queueDelayMinutes":  0,
        "waitTimeMinutes":     0,
        "totalCost":          0,
        "decisionLog":        log,
        "evaluationBreadcrumbs": [bc.model_dump() if hasattr(bc, 'model_dump') else bc for bc in breadcrumbs_list],
        "feasible":           False,
        "fallbackReason":     reason,
    }


# ── In-memory request/result store ───────────────────────────────────────────
_requests:        dict[str, dict] = {}
_dispatch_results: dict[str, dict] = {}


# ── WebSocket manager ─────────────────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self._connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self._connections.append(ws)
        print(f"[ws] client connected ({len(self._connections)} total)")

    def disconnect(self, ws: WebSocket):
        if ws in self._connections:
            self._connections.remove(ws)
        print(f"[ws] client disconnected ({len(self._connections)} total)")

    async def broadcast(self, message: dict):
        dead = []
        for ws in self._connections:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.append(ws)
        for ws in dead:
            if ws in self._connections:
                self._connections.remove(ws)


manager = ConnectionManager()


# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(title="Rural Healthcare Dispatch API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/")
@app.get("/health")
def health_check():
    """Health check endpoint for Render monitoring and UptimeRobot keep-alive."""
    return {
        "status": "healthy",
        "service": "PulseRoute AI Dispatch Engine",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "graph_nodes": len(_graph.nodes),
        "hospitals_online": len(_hospitals_list),
        "ambulances_active": len(_ambulances_list),
    }


# ── Simulation loop ───────────────────────────────────────────────────────────
VILLAGES = [
    {"id": "vil_01", "name": "Ghoti",         "lat": 19.7300, "lng": 73.6500, "node_id": "vil_01"},
    {"id": "vil_02", "name": "Niphad",         "lat": 20.0800, "lng": 74.1100, "node_id": "vil_02"},
    {"id": "vil_03", "name": "Yeola",          "lat": 20.0400, "lng": 74.4800, "node_id": "vil_03"},
    {"id": "vil_04", "name": "Peth",           "lat": 19.5200, "lng": 73.4800, "node_id": "vil_04"},
    {"id": "vil_05", "name": "Chandwad",       "lat": 20.3300, "lng": 74.2500, "node_id": "vil_05"},
    {"id": "vil_06", "name": "Surgana",        "lat": 20.5600, "lng": 73.6200, "node_id": "vil_06"},
    {"id": "vil_07", "name": "Kalwan",         "lat": 20.5500, "lng": 73.9200, "node_id": "vil_07"},
    {"id": "vil_08", "name": "Trimbakeshwar",  "lat": 19.9300, "lng": 73.5300, "node_id": "vil_08"},
]
SPECIALTIES      = list(SPECIALTY_MAP.keys())
URGENCY_TIERS    = ["critical", "urgent", "elevated", "routine"]
URGENCY_ENUM_MAP = {
    "critical": UrgencyLevel.TIER_1_CRITICAL,
    "urgent":   UrgencyLevel.TIER_2_URGENT,
    "elevated": UrgencyLevel.TIER_2_URGENT,
    "routine":  UrgencyLevel.TIER_3_MODERATE,
}
MEDICINE_SAMPLES = [
    {"name": "Epinephrine", "qty": 1},
    {"name": "Aspirin",     "qty": 2},
    {"name": "Morphine",    "qty": 1},
    {"name": "Heparin",     "qty": 1},
]


async def _do_dispatch(request_dict: dict, village_node_id: str, specialty_str: str, urgency_str: str):
    """Run the engine orchestrator and broadcast the result."""
    import time
    specialty_enum = SPECIALTY_MAP.get(specialty_str, list(SPECIALTY_MAP.values())[0])
    urgency_enum   = URGENCY_ENUM_MAP.get(urgency_str, UrgencyLevel.TIER_3_MODERATE)

    eng_request = EmergencyRequest(
        id=request_dict["id"],
        village_node_id=village_node_id,
        patient_name=request_dict.get("villageName", "Unknown"),
        condition_description=f"{urgency_str.title()} {specialty_str} case",
        urgency=urgency_enum,
        required_specialty=specialty_enum,
        required_medicines={},   # simplified: no medicine constraint for sim
        timestamp=time.time(),
    )

    orchestrator.submit_request(eng_request)
    plan, breadcrumbs = orchestrator.evaluate_and_dispatch_next()

    if plan:
        result = _plan_to_result(plan, request_dict)
        # Update ambulance status in our tracking dict
        amb = orchestrator.ambulances.get(plan.assigned_ambulance_id)
        if amb:
            amb.lat = _graph.nodes[plan.pickup_path_nodes[-1]].lat if plan.pickup_path_nodes else amb.lat
            amb.lng = _graph.nodes[plan.pickup_path_nodes[-1]].lng if plan.pickup_path_nodes else amb.lng
        _requests[request_dict["id"]]["status"] = "matched"

        # Schedule ambulance return and patient discharge (frees bed after treatment)
        asyncio.create_task(_return_ambulance(plan.assigned_ambulance_id, plan.target_hospital_id, plan.total_trip_mins * 1.5))
    else:
        result = _unfulfillable(request_dict["id"], [], "no_matching_hospital", breadcrumbs=breadcrumbs)
        _requests[request_dict["id"]]["status"] = "unfulfillable"

    _dispatch_results[request_dict["id"]] = result
    await manager.broadcast({"type": "dispatch:result",  "payload": result})
    await manager.broadcast({"type": "resources:update", "payload": _snapshot()})


async def _return_ambulance(amb_id: str, hospital_id: str, delay: float):
    await asyncio.sleep(min(delay, 25))
    amb = orchestrator.ambulances.get(amb_id)
    if amb:
        amb.status = AmbulanceStatus.IDLE
        # Return to base depot
        base = _graph.nodes.get(amb.base_node_id)
        if base:
            amb.current_node_id = amb.base_node_id
            amb.lat = base.lat
            amb.lng = base.lng

    hosp = orchestrator.hospitals.get(hospital_id)
    if hosp:
        hosp.available_beds = min(hosp.total_beds, hosp.available_beds + 1)
        hosp.current_queue_length = max(0, hosp.current_queue_length - 1)

    await manager.broadcast({"type": "resources:update", "payload": _snapshot()})
    print(f"[sim] {amb_id} returned to base & bed freed at {hospital_id}")


async def _simulation_loop():
    await asyncio.sleep(4)  # let frontend connect first
    while True:
        try:
            village  = random.choice(VILLAGES)
            spec     = random.choice(SPECIALTIES)
            urgency  = random.choices(URGENCY_TIERS, weights=[10, 35, 35, 20])[0]

            request_dict = {
                "id":              f"req_{uuid.uuid4().hex[:8]}",
                "villageId":       village["id"],
                "villageName":     village["name"],
                "lat":             village["lat"] + random.uniform(-0.01, 0.01),
                "lng":             village["lng"] + random.uniform(-0.01, 0.01),
                "specialtyNeeded": spec,
                "urgencyTier":     urgency,
                "slaDeadline":     (datetime.now(timezone.utc) + timedelta(minutes=random.randint(30, 90))).isoformat(),
                "status":          "pending",
                "createdAt":       datetime.now(timezone.utc).isoformat(),
            }

            _requests[request_dict["id"]] = request_dict
            await manager.broadcast({"type": "request:new", "payload": request_dict})
            print(f"[sim] {request_dict['id']} — {village['name']} ({urgency} / {spec})")

            await asyncio.sleep(random.uniform(2, 4))
            await _do_dispatch(request_dict, village["node_id"], spec, urgency)

            await asyncio.sleep(random.uniform(12, 25))
        except asyncio.CancelledError:
            break
        except Exception as exc:
            print(f"[sim] error: {exc}")
            await asyncio.sleep(5)


@app.on_event("startup")
async def on_startup():
    asyncio.create_task(_simulation_loop())
    print("[server] Engine dispatch server started (DispatchOrchestrator active).")


# ── REST endpoints ────────────────────────────────────────────────────────────
@app.get("/resources/snapshot")
def get_snapshot():
    return _snapshot()


class RequestPayload(BaseModel):
    villageName:     str
    specialtyNeeded: str
    urgencyTier:     str
    lat:             Optional[float] = None
    lng:             Optional[float] = None


@app.post("/requests", status_code=201)
async def create_request(payload: RequestPayload):
    # Lookup village details by villageName matching
    matching_village = next((v for v in VILLAGES if v["name"].lower() == payload.villageName.lower()), None)
    
    if payload.lat is not None and payload.lng is not None:
        lat, lng = payload.lat, payload.lng
        nearest = min(VILLAGES, key=lambda v: (v["lat"]-lat)**2 + (v["lng"]-lng)**2)
        node_id = nearest["node_id"]
    elif matching_village:
        lat, lng, node_id = matching_village["lat"], matching_village["lng"], matching_village["node_id"]
    else:
        v = random.choice(VILLAGES)
        lat, lng, node_id = v["lat"], v["lng"], v["node_id"]

    request_dict = {
        "id":              f"req_{uuid.uuid4().hex[:8]}",
        "villageId":       node_id,
        "villageName":     matching_village["name"] if matching_village else payload.villageName,
        "lat":             lat,
        "lng":             lng,
        "specialtyNeeded": payload.specialtyNeeded,
        "urgencyTier":     payload.urgencyTier,
        "slaDeadline":     (datetime.now(timezone.utc) + timedelta(minutes=60)).isoformat(),
        "status":          "pending",
        "createdAt":       datetime.now(timezone.utc).isoformat(),
    }
    _requests[request_dict["id"]] = request_dict
    await manager.broadcast({"type": "request:new", "payload": request_dict})
    asyncio.create_task(_do_dispatch(request_dict, node_id, payload.specialtyNeeded, payload.urgencyTier))
    return request_dict


@app.get("/requests/{request_id}/result")
def get_result(request_id: str):
    result = _dispatch_results.get(request_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not yet available")
    return result


@app.post("/requests/{request_id}/recalculate")
async def recalculate_route(request_id: str):
    req = _requests.get(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Find matching node ID for request village
    matching_v = next((v for v in VILLAGES if v["name"] == req["villageName"]), VILLAGES[0])
    await _do_dispatch(req, matching_v["node_id"], req["specialtyNeeded"], req["urgencyTier"])
    return {"status": "recalculated", "result": _dispatch_results.get(request_id)}


@app.post("/requests/{request_id}/accept")
async def accept_dispatch_route(request_id: str):
    result = _dispatch_results.get(request_id)
    if not result or not result.get("feasible"):
        raise HTTPException(status_code=400, detail="No feasible dispatch plan to accept")
    
    amb_id = result.get("ambulanceId")
    if amb_id and amb_id in orchestrator.ambulances:
        amb = orchestrator.ambulances[amb_id]
        amb.status = AmbulanceStatus.EN_ROUTE_PICKUP
        await manager.broadcast({"type": "resources:update", "payload": _snapshot()})
        return {"status": "accepted", "ambulanceId": amb_id, "ambulanceStatus": amb.status}
    return {"status": "accepted"}


@app.get("/graph/nodes")
def get_graph_nodes():
    """Expose the graph topology for optional frontend visualisation."""
    return {
        "nodes": [{"id": n.id, "name": n.name, "type": n.type, "lat": n.lat, "lng": n.lng}
                  for n in _graph.nodes.values()],
        "edges": [{"u": eid, "edges": [{"v": e.v, "distKm": e.distance_km} for e in edges]}
                  for eid, edges in _graph.adj_list.items()],
    }


# ── WebSocket ─────────────────────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        await ws.send_text(json.dumps({"type": "resources:update", "payload": _snapshot()}))
        while True:
            data = await ws.receive_text()
            try:
                msg = json.loads(data)
                print(f"[ws] client msg: {msg}")
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(ws)


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
