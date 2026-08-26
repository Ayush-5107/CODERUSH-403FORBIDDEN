# 🚑 Rural Healthcare Dispatch & Pathfinding Engine
## 📘 Frontend Integration & API Specification Guide

Welcome! This document provides all the technical details, endpoint specifications, data formats, and copy-paste code snippets required for a frontend developer to connect seamlessly with the C++20 Algorithmic Dispatch Engine.

---

## 🚀 1. Server Configuration & Status

- **Base URL**: `http://localhost:8000`
- **Protocol**: HTTP / REST / JSON
- **CORS Support**: `Access-Control-Allow-Origin: *` (Fully enabled for all ports and origins)
- **Preflight Support**: Handles `HTTP OPTIONS` automatically for cross-origin browser requests.

### How to Run the Backend Server (Windows):
```powershell
cd C:\Users\ACER\.gemini\antigravity\scratch\rural_health_engine
.\server.exe
```
*(The server listens on `http://localhost:8000`)*

---

## 📡 2. REST API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/network` | Returns graph topology (nodes, coordinates, and road edges) |
| `GET` | `/api/hospitals` | Returns hospital live telemetry (beds, specialists, drug inventory, queues) |
| `GET` | `/api/ambulances` | Returns ambulance fleet status (base locations, GPS coordinates, status) |
| `POST` | `/api/emergency` | Evaluates patient request & calculates optimal hospital + ambulance dispatch |
| `POST` | `/api/scenario/demo` | Idempotent endpoint executing the hackathon Cardiac Emergency scenario |
| `GET` | `/api/decision_logs` | Returns full history of dispatch decisions & audit logs |

---

## 📄 3. Detailed Endpoint Specs & JSON Samples

### Endpoint 1: `GET /api/network`
Retrieves all graph nodes (villages, hospitals, depots, junctions) and road connections.

#### Sample Response (`200 OK`):
```json
{
  "nodes": [
    { "id": "Village_Alpha", "name": "Village Alpha", "type": "VILLAGE", "lat": 12.9716, "lng": 77.5946 },
    { "id": "Hospital_C", "name": "Hospital C (Regional Cardiac)", "type": "HOSPITAL", "lat": 13.0500, "lng": 77.6800 },
    { "id": "Base_Station_1", "name": "Ambulance Depot 1", "type": "AMBULANCE_BASE", "lat": 12.9750, "lng": 77.5900 }
  ],
  "edges": [
    { "u": "Village_Alpha", "v": "Base_Station_1", "distance_km": 2.5, "speed_limit_kmh": 50.0 }
  ]
}
```

---

### Endpoint 2: `GET /api/hospitals`
Retrieves live hospital telemetry.

#### Sample Response (`200 OK`):
```json
[
  {
    "id": "Hospital_C",
    "name": "Hospital C (Regional Cardiac & Super Specialty)",
    "available_beds": 12,
    "total_beds": 25,
    "specialists": ["CARDIOLOGY", "NEUROLOGY", "TRAUMA", "GENERAL_SURGERY"],
    "medicine_stock": { "Epinephrine": 50, "Aspirin": 200 }
  }
]
```

---

### Endpoint 3: `POST /api/emergency`
Submits an emergency request. The engine evaluates all candidate hospitals against multi-criteria rules (specialist availability, bed capacity, medicine stock, travel time + queue delay) and selects the optimal hospital.

#### Request Body (`POST /api/emergency`):
```json
{
  "village_node_id": "Village_Alpha",
  "patient_name": "John Doe",
  "required_specialty": "CARDIOLOGY",
  "urgency_tier": 1,
  "required_medicines": {
    "Epinephrine": 1
  }
}
```

#### Response Payload (`200 OK`):
```json
{
  "request_id": "REQ-101",
  "patient_village_id": "Village_Alpha",
  "target_hospital_id": "Hospital_C",
  "target_hospital_name": "Hospital C (Regional Cardiac & Super Specialty)",
  "assigned_ambulance_id": "AMB-101",
  "pickup_time_mins": 3.0,
  "delivery_time_mins": 40.25,
  "hospital_queue_delay_mins": 20.0,
  "total_trip_mins": 63.25,

  "visited_nodes_in_order": [
    "Base_Station_1", "Village_Alpha", "Junction_Crossroads", "Hospital_A", "Hospital_B", "Junction_North", "Hospital_C"
  ],

  "geojson_pickup_route": [
    [12.9750, 77.5900], [12.9716, 77.5946]
  ],

  "geojson_delivery_route": [
    [12.9716, 77.5946], [12.9650, 77.6000], [12.9850, 77.6300], [13.0100, 77.6200], [13.0500, 77.6800]
  ],

  "geojson_explored_edges": [
    [[12.9716, 77.5946], [12.9750, 77.5900]],
    [[12.9716, 77.5946], [12.9650, 77.6000]],
    [[12.9650, 77.6000], [12.9850, 77.6300]],
    [[12.9850, 77.6300], [13.0500, 77.6800]]
  ],

  "evaluation_logs": [
    {
      "hospital_id": "Hospital_B",
      "hospital_name": "Hospital B (Plastic Clinic)",
      "status": "REJECTED",
      "rejection_reasons": [
        "Lacks required specialist (CARDIOLOGY)",
        "Insufficient medicine stock for 'Epinephrine'"
      ]
    },
    {
      "hospital_id": "Hospital_A",
      "hospital_name": "Hospital A (District General)",
      "status": "REJECTED",
      "rejection_reasons": [
        "Lacks required specialist (CARDIOLOGY)",
        "No available beds (Full capacity: 10/10)"
      ]
    },
    {
      "hospital_id": "Hospital_C",
      "hospital_name": "Hospital C (Regional Cardiac & Super Specialty)",
      "status": "APPROVED",
      "rejection_reasons": []
    }
  ]
}
```

---

## 🎨 4. Visualization & Frontend Rendering Guide

### How to render the Map & Pathfinding Animations:

```javascript
// 1. Fetch Demo Dispatch Plan
const res = await fetch('http://localhost:8000/api/scenario/demo', { method: 'POST' });
const plan = await res.json();

// A. Step-by-Step Node Search Animation (honzaap/Pathfinding style)
for (const nodeId of plan.visited_nodes_in_order) {
  // Highlight node marker on map
  console.log('Searching node:', nodeId);
  await new Promise(r => setTimeout(r, 150));
}

// B. Draw Explored Search Tree Grid (Blue Network Mesh)
plan.geojson_explored_edges.forEach(segment => {
  L.polyline(segment, { color: '#0088ff', weight: 2, opacity: 0.7 }).addTo(map);
});

// C. Draw Ambulance Pickup Route (Blue Dashed Line)
L.polyline(plan.geojson_pickup_route, { color: '#3b82f6', weight: 5, dashArray: '6, 6' }).addTo(map);

// D. Draw Selected Delivery Route (Neon Green Solid Line)
L.polyline(plan.geojson_delivery_route, { color: '#00ff66', weight: 6 }).addTo(map);

// E. Display Decision Breadcrumbs (Approved vs Rejected Cards)
plan.evaluation_logs.forEach(log => {
  console.log(`${log.hospital_name}: ${log.status}`);
  if (log.rejection_reasons.length > 0) {
    console.log('Rejections:', log.rejection_reasons);
  }
});
```

---

## ⚡ 5. Summary Checklist for Frontend Teammate

- ✅ Base URL: `http://localhost:8000`
- ✅ CORS enabled automatically for all origins.
- ✅ All coordinate arrays use standard `[latitude, longitude]` float pairs.
- ✅ Fully idempotent demo available via `POST /api/scenario/demo`.
