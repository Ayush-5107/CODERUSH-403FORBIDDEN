"""
dispatch.py — Core dispatch algorithm.

Selects the best (ambulance, hospital) pair for an emergency request.
Produces a structured DispatchResult that exactly matches the frontend
contract defined in contract.js.

Algorithm: greedy weighted-cost minimisation
  cost(amb, hosp) = α * travel_time + β * wait_time + γ * specialty_penalty
where:
  travel_time  = haversine(ambulance → patient → hospital) / avg_speed
  wait_time    = 0 if beds available, else estimated_queue_minutes
  specialty_penalty = 0 if specialty matched, else BIG_PENALTY
"""
import math
import uuid
from datetime import datetime, timezone
from typing import Optional

# Tuning weights (can be adjusted for the demo)
ALPHA = 0.6   # weight on travel time
BETA  = 0.3   # weight on wait time
GAMMA = 0.1   # weight on specialty match

AVG_SPEED_KMH = 60.0          # ambulance average speed
BED_WAIT_MINUTES = 30         # estimated wait if no beds
SPECIALTY_PENALTY = 120       # minutes added when specialty not available
BIG_PENALTY = float("inf")    # instantly eliminates the option


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in kilometres."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _travel_minutes(d_km: float) -> float:
    return (d_km / AVG_SPEED_KMH) * 60.0


def dispatch(request: dict, ambulances: list[dict], hospitals: list[dict]) -> dict:
    """
    Run the dispatch algorithm and return a DispatchResult dict matching
    the frontend DispatchResultShape contract.

    Parameters
    ----------
    request   : EmergencyRequest dict (from state)
    ambulances: list of Ambulance dicts
    hospitals : list of Hospital dicts

    Returns
    -------
    DispatchResult dict
    """
    available_ambos = [a for a in ambulances if a["status"] == "available"]
    decision_log: list[str] = []

    if not available_ambos:
        decision_log.append("All ambulances are occupied — request unfulfillable.")
        return _unfulfillable(request["id"], decision_log, "all_ambulances_occupied")

    best_cost = BIG_PENALTY
    best_amb = None
    best_hosp = None
    best_travel = 0.0
    best_wait = 0.0

    for hosp in hospitals:
        # --- Specialty check ---
        specialty_ok = request["specialtyNeeded"] in hosp["specialties"]
        if not specialty_ok:
            decision_log.append(
                f"{hosp['name']}: rejected — specialty '{request['specialtyNeeded']}' not available."
            )
            continue

        # --- Bed check ---
        if hosp["bedsAvailable"] <= 0:
            decision_log.append(f"{hosp['name']}: rejected — no beds available.")
            continue

        for amb in available_ambos:
            # Distance: ambulance → patient → hospital
            d_amb_patient  = _haversine_km(amb["lat"], amb["lng"], request["lat"], request["lng"])
            d_patient_hosp = _haversine_km(request["lat"], request["lng"], hosp["lat"], hosp["lng"])
            total_km       = d_amb_patient + d_patient_hosp
            travel_t       = _travel_minutes(total_km)
            wait_t         = 0.0  # bed available

            cost = ALPHA * travel_t + BETA * wait_t
            decision_log.append(
                f"  Evaluating {amb['id']} → {hosp['name']}: "
                f"{total_km:.1f} km, {travel_t:.0f} min travel, cost={cost:.1f}"
            )

            if cost < best_cost:
                best_cost  = cost
                best_amb   = amb
                best_hosp  = hosp
                best_travel = travel_t
                best_wait   = wait_t

    if best_amb is None:
        decision_log.append("No feasible (ambulance, hospital) pair found — unfulfillable.")
        return _unfulfillable(request["id"], decision_log, "no_route")

    decision_log.append(
        f"Selected {best_amb['id']} → {best_hosp['name']}: "
        f"total cost {best_cost:.1f}, travel {best_travel:.0f} min."
    )

    pickup_coords = [[best_amb["lng"], best_amb["lat"]], [request["lng"], request["lat"]]]
    delivery_coords = [[request["lng"], request["lat"]], [best_hosp["lng"], best_hosp["lat"]]]
    full_route = [[best_amb["lng"], best_amb["lat"]], [request["lng"], request["lat"]], [best_hosp["lng"], best_hosp["lat"]]]

    return {
        "requestId":         request["id"],
        "ambulanceId":       best_amb["id"],
        "hospitalId":        best_hosp["id"],
        "hospitalName":      best_hosp["name"],
        "routeNodeIds":      [],
        "routeCoordinates":  full_route,
        "pickupRoute":       pickup_coords,
        "deliveryRoute":      delivery_coords,
        "pickupTimeMinutes":   round(best_travel * 0.4),
        "deliveryTimeMinutes": round(best_travel * 0.6),
        "queueDelayMinutes":   round(best_wait),
        "route": {
            "ambulanceId": best_amb["id"],
            "patientLat":  request["lat"],
            "patientLng":  request["lng"],
            "hospitalId":  best_hosp["id"],
        },

        "travelTimeMinutes": round(best_travel),
        "waitTimeMinutes":   round(best_wait),
        "totalCost":         round(best_cost),
        "decisionLog":       decision_log,
        "feasible":          True,
        "fallbackReason":    None,
    }


def _unfulfillable(request_id: str, log: list[str], reason: str) -> dict:
    return {
        "requestId":         request_id,
        "ambulanceId":       None,
        "hospitalId":        None,
        "hospitalName":      None,
        "routeNodeIds":      [],
        "routeCoordinates":  [],
        "route":             None,
        "travelTimeMinutes": 0,
        "waitTimeMinutes":   0,
        "totalCost":         0,
        "decisionLog":       log,
        "feasible":          False,
        "fallbackReason":    reason,
    }
