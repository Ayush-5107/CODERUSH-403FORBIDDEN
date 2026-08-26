"""
simulation.py — Background simulation loop.

Periodically generates synthetic emergency requests and feeds them through
the dispatch algorithm, broadcasting results over WebSocket so the frontend
sees a live, continuously updating system without needing human input.

Designed to look realistic in a demo:
  - new request every 12–25 seconds
  - 3-second delay between request arrival and dispatch decision
    (simulates algorithm "thinking")
  - ambulance status updates broadcast after each dispatch
"""
import asyncio
import copy
import random
import uuid
from datetime import datetime, timezone, timedelta

from seed_data import VILLAGES, SPECIALTIES, URGENCY_TIERS
from dispatch import dispatch


class SimulationLoop:
    def __init__(self, state: "AppState", broadcaster):
        self.state = state
        self.broadcast = broadcaster   # async callable(dict)
        self._task: asyncio.Task | None = None

    def start(self):
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._run())

    def stop(self):
        if self._task:
            self._task.cancel()

    async def _run(self):
        """Main loop — runs forever in the background."""
        # Wait a moment after server boot so the frontend WS connects first
        await asyncio.sleep(3)

        while True:
            try:
                await self._emit_request()
                # Wait 12–25 seconds before the next request
                await asyncio.sleep(random.uniform(12, 25))
            except asyncio.CancelledError:
                break
            except Exception as exc:
                print(f"[sim] Unhandled error: {exc}")
                await asyncio.sleep(5)

    async def _emit_request(self):
        """Generate one synthetic request, run dispatch, broadcast both."""
        village = random.choice(VILLAGES)

        # Add a tiny jitter to coordinates so requests don't stack on top of each other
        jitter = lambda: random.uniform(-0.02, 0.02)
        request = {
            "id":              f"req_{uuid.uuid4().hex[:8]}",
            "villageId":       village["id"],
            "villageName":     village["name"],
            "lat":             village["lat"] + jitter(),
            "lng":             village["lng"] + jitter(),
            "specialtyNeeded": random.choice(SPECIALTIES),
            "urgencyTier":     random.choices(
                URGENCY_TIERS,
                weights=[10, 35, 35, 20],   # critical rare, routine common
            )[0],
            "slaDeadline": (
                datetime.now(timezone.utc) + timedelta(minutes=random.randint(30, 90))
            ).isoformat(),
            "status":    "pending",
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }

        self.state.requests[request["id"]] = request
        await self.broadcast({"type": "request:new", "payload": request})
        print(f"[sim] New request {request['id']} from {village['name']} ({request['urgencyTier']})")

        # Simulate algorithm processing delay
        await asyncio.sleep(random.uniform(2, 4))

        result = dispatch(
            request,
            list(self.state.ambulances.values()),
            list(self.state.hospitals.values()),
        )
        self.state.dispatch_results[request["id"]] = result

        # Update ambulance status if dispatched
        if result["feasible"] and result["ambulanceId"]:
            amb_id = result["ambulanceId"]
            if amb_id in self.state.ambulances:
                self.state.ambulances[amb_id]["status"] = "en_route"
            self.state.requests[request["id"]]["status"] = "matched"
        else:
            self.state.requests[request["id"]]["status"] = "unfulfillable"

        await self.broadcast({"type": "dispatch:result", "payload": result})

        # Broadcast updated resource state
        snapshot = self.state.to_snapshot()
        await self.broadcast({"type": "resources:update", "payload": snapshot})

        # Return ambulance to available after travel time (minimum 20 s in sim)
        if result["feasible"] and result["ambulanceId"]:
            asyncio.create_task(
                self._return_ambulance(result["ambulanceId"], delay=result["travelTimeMinutes"] * 2)
            )

    async def _return_ambulance(self, amb_id: str, delay: float):
        """After the simulated trip, mark ambulance available again."""
        await asyncio.sleep(min(delay, 60))   # cap at 60 s for demo purposes
        if amb_id in self.state.ambulances:
            self.state.ambulances[amb_id]["status"] = "available"
            snapshot = self.state.to_snapshot()
            await self.broadcast({"type": "resources:update", "payload": snapshot})
            print(f"[sim] {amb_id} returned to available")
