# 🚑 Rural Healthcare Intelligent Routing & Dispatch Engine

An intelligent C++20 dynamic routing, multi-criteria hospital selection, and medicine inventory dispatch engine designed for emergency healthcare management in rural environments.

---

## 🌟 Key Features

- **4-Phase Dispatch Architecture**:
  1. **Phase 1 (Constraint Filtering)**: Filters candidate hospitals by medical specialist availability (Cardiology, Trauma, Surgery), bed capacity (>0), and emergency medicine stock.
  2. **Phase 2 (Pluggable Routing Engine)**: Supports **Dijkstra**, **A\* (A-Star)**, and **Bidirectional Dijkstra** algorithms.
  3. **Phase 3 (Multi-Criteria Cost Evaluation)**: Evaluates $\text{Total Cost} = \text{Pickup Time} + \text{Delivery Time} + \text{Hospital Queue Delay}$.
  4. **Phase 4 (Optimal Selection)**: Selects the feasible hospital with minimum total operational cost.

- **Judges' Algorithm Benchmark Engine**:
  - Live runtime node-exploration benchmarks comparing **Dijkstra** vs **Bidirectional Dijkstra** vs **A\*** (Haversine admissible heuristic).
  - Outputs search tree geometries (`geojson_explored_edges`) and shortest path polylines (`geojson_delivery_route`).

- **CORS-Enabled C++ REST API Server**:
  - Embedded C++ HTTP REST server (`httplib.h` & `json.hpp`) running at `http://localhost:8000`.

---

## 📁 Repository Structure

```
rural_health_engine/
├── models.hpp              # Data structures (Node, Edge, Hospital, Ambulance, DispatchResult, AlgorithmBenchmark)
├── graph_engine.hpp        # Dijkstra, A*, Bidirectional Dijkstra, & Benchmark Runner
├── dispatch_engine.hpp     # 4-Phase multi-criteria evaluator & decision log breadcrumbs
├── seed_data.hpp           # Rural health network topology loader
├── main.cpp                # CORS-enabled C++ HTTP REST API server
├── test_cpp.cpp            # Test suite for routing & benchmark validation
├── API_DOCUMENTATION.md    # Complete frontend API specification & JS fetch snippets
└── README.md               # Project overview
```

---

## 🚀 Building & Running

### Requirements
- **GCC / G++ 10+** (C++20 support required)
- Windows MinGW / MSYS2 or Linux/macOS

### Compilation (Windows GCC)
```powershell
g++ -std=c++20 -Iinclude main.cpp -o server.exe -lws2_32
```

### Execution
```powershell
.\server.exe
```
*(The server will start listening on `http://localhost:8000`)*

---

## 📡 API Quickstart

### Dispatch Emergency Request
```http
POST http://localhost:8000/api/emergency
Content-Type: application/json

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

### Sample Response Output:
```json
{
  "request_id": "REQ-101",
  "target_hospital_name": "Hospital C (Regional Cardiac & Super Specialty)",
  "assigned_ambulance_id": "AMB-101",
  "total_trip_mins": 63.25,
  "algorithm_benchmarks": {
    "dijkstra_nodes_explored": 11,
    "bidirectional_dijkstra_nodes_explored": 8,
    "astar_nodes_explored": 10,
    "astar_efficiency_gain_pct": 9.1
  }
}
```

---

## 📜 License
MIT License
