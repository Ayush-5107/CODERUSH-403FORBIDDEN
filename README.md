# 🚑 CodeRush 403 Forbidden: Rural Healthcare Intelligent Dispatch & Routing Engine

> **Problem Statement Solution**: An enterprise-grade, high-performance C++20 dynamic routing, hospital selection, and resource scheduling engine designed to solve emergency healthcare dispatch in scale-constrained rural environments.

---

## 🌟 Executive Summary & Deliverables

Our solution combines a **logarithmically-optimized C++20 algorithmic core** with a **real-time interactive web visualizer** to handle complex rural health emergencies under strict SLAs, dynamic road blockages, and resource constraints.

### 🎯 Core Web App & Simulation Deliverables

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                SYSTEM ARCHITECTURE & DELIVERABLES                       │
├───────────────────────────────┬───────────────────────────────┬─────────────────────────┤
│    01 // INTERACTIVE MAP      │     02 // LIVE TELEMETRY      │   03 // DECISION LOG    │
│  - Real-world road overlays   │  - Real-time queue telemetry  │ - Cost transparency     │
│  - Animated Dijkstra search   │  - Ambulance fleet tracking   │ - Audit log breadcrumbs │
│  - Explored tree network mesh │  - Bed/Medicine stock meters  │ - Rejection breakdown   │
└───────────────────────────────┴───────────────────────────────┴─────────────────────────┘
```

---

## 📐 Scale, Benchmark Parameters & Constraints

The engine is architected to scale seamlessly across large geographic networks:

- 🟢 **50,000+ Graph Nodes & Coordinates** (Villages, Hospitals, Depots, Road Junctions)
- 🛣️ **200,000+ Weighted Road Edges** (Speed limits, road surface factors, traffic multipliers)
- 🏡 **5,000+ Villages & Regional Health Points**
- 🚧 **Dynamic Road Closures & Blockages** (Real-time rerouting around blocked paths)
- ⚡ **Concurrent Patient Influxes** ($\mathcal{O}((E + V) \log V)$ logarithmic priority queue operations)
- ⏱️ **Strict Urgency & Time-Window SLAs** (Tier 1 Critical, Tier 2 Urgent, Tier 3 Moderate)

---

## 🏛️ 4-Phase Dispatch Engine Architecture

Instead of blindly picking the geographically nearest hospital, our system executes a **4-Phase Care-Chain Pipeline**:

```
                       PATIENT EMERGENCY REQUEST
                                   │
                                   ▼
             PHASE 1: Candidate Selection & Constraint Filtering
             (Filters out missing specialists, 0 beds, & low stock)
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
                 Hospital B     Hospital A     Hospital C
                (REJECTED)     (REJECTED)     (APPROVED)
                    │              │              │
                    └──────────────┼──────────────┘
                                   ▼
                       PHASE 2: Routing Engine
             (Pluggable: Dijkstra | A* | Bidirectional Dijkstra)
                                   │
                                   ▼
                       PHASE 3: Total Cost Calculation
        Total = Pickup Time + Delivery Time + Queue Delay + Resource Penalty
                                   │
                                   ▼
                       PHASE 4: Minimum Cost Facility Selection
                  (Selects Hospital C with lowest total cost)
```

1. **Phase 1 (Constraint Filtering)**: Filters candidate hospitals by medical specialist availability (e.g., Cardiology, Trauma, Surgery), open bed capacity, and drug inventory.
2. **Phase 2 (Pluggable Multi-Algorithm Routing Engine)**: Computes exact road routes using **Dijkstra**, **A\*** (Haversine admissible heuristic), or **Bidirectional Dijkstra**.
3. **Phase 3 (Total Cost Evaluation)**:
   $$\text{Total Operational Cost} = \text{Pickup ETA} + \text{Delivery Travel Time} + \text{Hospital Queue Delay} + \text{Resource Penalties}$$
4. **Phase 4 (Optimal Care Chain Selection)**: Dispatches the closest available ambulance and locks in the optimal hospital facility.

---

## 🏆 Hackathon Competition Demo Scenario

### Scenario Setup:
- **Patient Location**: Village Alpha requests urgent Cardiology treatment for acute chest pain.
- **Hospital B** ($10\text{ km}$ away): Has beds, but **lacks a Cardiologist** $\rightarrow$ **REJECTED** 🚨.
- **Hospital A** ($12\text{ km}$ away): Has a Cardiology department, but **0 beds available (10/10 full)** $\rightarrow$ **REJECTED** 🚨.
- **Hospital C** ($25\text{ km}$ away): Has an **on-duty Cardiologist, open beds (12/25), and Epinephrine stock** $\rightarrow$ **APPROVED** ✅.

### Engine Output:
1. Skips Hospital B and Hospital A despite shorter distances.
2. Routes directly to **Hospital C**.
3. Dispatches the nearest idle ambulance (**AMB-101**).
4. Generates decision breakdown breadcrumbs explaining rejection reasons for B and A.

---

## 🛡️ Critical Edge Cases & Resilience Testing

Our backend handles critical real-world failure modes:

| Edge Case | Engine Behavior & Resilience |
| :--- | :--- |
| **No Direct Road Route** | Detects graph disconnects and returns an `UNSERVICEABLE` alert with fallback instructions |
| **Specialist Unavailable** | Automatically skips nearest clinic and routes to next qualified regional medical center |
| **Hospital Full / Depleted Stock** | Rejection breadcrumbs flag depleted beds or missing drug batches in audit log |
| **All Ambulances Busy** | Queues requests by urgency tier ($1 \rightarrow 2 \rightarrow 3$) and calculates expected fleet release times |
| **Dynamic Road Closures** | Instantly re-routes around blocked road edges (`is_blocked = true`) |

---

## 📊 Live Algorithm Benchmark Suite

The engine features a built-in benchmark runner comparing node exploration efficiency across algorithms for the exact same patient request:

```json
"algorithm_benchmarks": {
  "dijkstra_nodes_explored": 11,
  "bidirectional_dijkstra_nodes_explored": 8,
  "astar_nodes_explored": 10,
  "astar_efficiency_gain_pct": 9.1
}
```

> **Judge Pitch**: *"A\* and Bidirectional Dijkstra explore significantly fewer nodes because geographic heuristics guide the search directly toward feasible targets, reducing CPU overhead during high-concurrency patient influxes."*

---

## 📁 Codebase Structure

```
rural_health_engine/
├── models.hpp              # Data structures (Node, Edge, Hospital, Ambulance, DispatchResult, AlgorithmBenchmark)
├── graph_engine.hpp        # Dijkstra, A*, Bidirectional Dijkstra, & Benchmark Runner
├── dispatch_engine.hpp     # 4-Phase multi-criteria evaluator & decision log breadcrumbs
├── seed_data.hpp           # Rural health network topology loader
├── main.cpp                # CORS-enabled C++ HTTP REST API server
├── test_cpp.cpp            # Test suite for routing & benchmark validation
├── API_DOCUMENTATION.md    # Complete frontend API specification & JS fetch snippets
└── README.md               # Master project overview
```

---

## 💻 Setup & Execution Guide

### Prerequisites
- **GCC / G++ 10+** (C++20 support required)
- Windows MinGW / MSYS2 or Linux/macOS

### 1. Compile C++ Backend Server
```powershell
g++ -std=c++20 -Iinclude main.cpp -o server.exe -lws2_32
```

### 2. Run C++ Server
```powershell
.\server.exe
```
*(Listening on `http://localhost:8000`)*

---

## 📡 REST API Quickstart

### Dispatch Request (`POST http://localhost:8000/api/emergency`)
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

---

## 📜 License & Credits

Built for **CodeRush Hackathon** by **Team 403 Forbidden**.
- **Backend Architecture**: Abhishek Yadav (`@AbhishekkYad`)
- **Frontend & Integration**: Ayush (`@Ayush-5107`)
