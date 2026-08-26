"""
world_graph.py — Nashik-district rural road network built on engine_lib.RuralRoadGraph.

Nodes: 4 hospitals + 5 ambulance depots + 8 villages + 6 highway junctions.
Edges: realistic road segments (distance, speed limit, traffic, road condition).
The graph is used by DispatchOrchestrator for Dijkstra / A* routing.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "engine_lib"))

from engine_lib.models import (
    GraphNode, GraphEdge, NodeType,
    Hospital, Ambulance, AmbulanceStatus, MedicalSpecialty,
)
from engine_lib.graph_engine import RuralRoadGraph


def build_world() -> tuple[RuralRoadGraph, list[Hospital], list[Ambulance]]:
    """Return (graph, hospitals, ambulances) for the Nashik simulation."""

    graph = RuralRoadGraph()

    # ── Nodes ───────────────────────────────────────────────────────────────
    # Hospitals
    H_NASHIK    = "hosp_01"
    H_SINNAR    = "hosp_02"
    H_IGATPURI  = "hosp_03"
    H_DINDORI   = "hosp_04"

    # Ambulance depots (one per ambulance)
    D_AMB01 = "depot_amb01"
    D_AMB02 = "depot_amb02"
    D_AMB03 = "depot_amb03"
    D_AMB04 = "depot_amb04"
    D_AMB05 = "depot_amb05"

    # Villages
    V_GHOTI    = "vil_01"
    V_NIPHAD   = "vil_02"
    V_YEOLA    = "vil_03"
    V_PETH     = "vil_04"
    V_CHANDWAD = "vil_05"
    V_SURGANA  = "vil_06"
    V_KALWAN   = "vil_07"
    V_TRIMBAK  = "vil_08"

    # Highway junctions
    J_NASHIK_CENTRAL = "jct_nashik"
    J_NH3_NORTH      = "jct_nh3_n"
    J_NH3_SOUTH      = "jct_nh3_s"
    J_EAST_BYPASS    = "jct_east"
    J_WEST_GHT       = "jct_west"
    J_DINDORI_X      = "jct_dindori"

    nodes = [
        # Hospitals
        GraphNode(id=H_NASHIK,   name="Nashik District Hospital",      type=NodeType.HOSPITAL,        lat=19.9975, lng=73.7898),
        GraphNode(id=H_SINNAR,   name="Sinnar Rural Medical Centre",   type=NodeType.HOSPITAL,        lat=19.8494, lng=74.0006),
        GraphNode(id=H_IGATPURI, name="Igatpuri Primary Health",       type=NodeType.HOSPITAL,        lat=19.6926, lng=73.5614),
        GraphNode(id=H_DINDORI,  name="Dindori Community Hospital",    type=NodeType.HOSPITAL,        lat=20.2011, lng=73.8302),

        # Ambulance depots
        GraphNode(id=D_AMB01, name="Depot-1 (Nashik Central)",         type=NodeType.AMBULANCE_BASE,  lat=19.9500, lng=73.7600),
        GraphNode(id=D_AMB02, name="Depot-2 (Nashik East)",            type=NodeType.AMBULANCE_BASE,  lat=20.0100, lng=73.8100),
        GraphNode(id=D_AMB03, name="Depot-3 (Igatpuri Area)",          type=NodeType.AMBULANCE_BASE,  lat=19.8800, lng=73.7200),
        GraphNode(id=D_AMB04, name="Depot-4 (Sinnar Road)",            type=NodeType.AMBULANCE_BASE,  lat=19.9200, lng=73.9000),
        GraphNode(id=D_AMB05, name="Depot-5 (Dindori Road)",           type=NodeType.AMBULANCE_BASE,  lat=20.1500, lng=73.8000),

        # Villages
        GraphNode(id=V_GHOTI,    name="Ghoti",          type=NodeType.VILLAGE, lat=19.7300, lng=73.6500),
        GraphNode(id=V_NIPHAD,   name="Niphad",         type=NodeType.VILLAGE, lat=20.0800, lng=74.1100),
        GraphNode(id=V_YEOLA,    name="Yeola",           type=NodeType.VILLAGE, lat=20.0400, lng=74.4800),
        GraphNode(id=V_PETH,     name="Peth",            type=NodeType.VILLAGE, lat=19.5200, lng=73.4800),
        GraphNode(id=V_CHANDWAD, name="Chandwad",        type=NodeType.VILLAGE, lat=20.3300, lng=74.2500),
        GraphNode(id=V_SURGANA,  name="Surgana",         type=NodeType.VILLAGE, lat=20.5600, lng=73.6200),
        GraphNode(id=V_KALWAN,   name="Kalwan",          type=NodeType.VILLAGE, lat=20.5500, lng=73.9200),
        GraphNode(id=V_TRIMBAK,  name="Trimbakeshwar",   type=NodeType.VILLAGE, lat=19.9300, lng=73.5300),

        # Junctions
        GraphNode(id=J_NASHIK_CENTRAL, name="Nashik City Centre",    type=NodeType.JUNCTION, lat=19.9975, lng=73.7898),
        GraphNode(id=J_NH3_NORTH,      name="NH3 North Pass",         type=NodeType.JUNCTION, lat=20.2500, lng=73.8000),
        GraphNode(id=J_NH3_SOUTH,      name="NH3 South Gate",         type=NodeType.JUNCTION, lat=19.7500, lng=73.7500),
        GraphNode(id=J_EAST_BYPASS,    name="Eastern Bypass Junction", type=NodeType.JUNCTION, lat=20.0000, lng=74.0500),
        GraphNode(id=J_WEST_GHT,       name="Western Ghats Entry",     type=NodeType.JUNCTION, lat=19.7800, lng=73.5800),
        GraphNode(id=J_DINDORI_X,      name="Dindori Crossroads",      type=NodeType.JUNCTION, lat=20.1500, lng=73.8000),
    ]
    for n in nodes:
        graph.add_node(n)

    # ── Edges ────────────────────────────────────────────────────────────────
    # (u, v, dist_km, speed_kmh, traffic_factor, road_condition_factor)
    edge_specs = [
        # Nashik central hub connections
        (H_NASHIK,    J_NASHIK_CENTRAL, 0.5,  50, 1.3, 1.0),
        (J_NASHIK_CENTRAL, D_AMB01,     6.2,  50, 1.2, 1.0),
        (J_NASHIK_CENTRAL, D_AMB02,     7.8,  50, 1.4, 1.0),
        (J_NASHIK_CENTRAL, J_NH3_NORTH, 28.0, 80, 1.0, 1.0),
        (J_NASHIK_CENTRAL, J_NH3_SOUTH, 25.0, 70, 1.0, 1.0),
        (J_NASHIK_CENTRAL, J_EAST_BYPASS, 23.0, 65, 1.1, 1.0),

        # Depots to nearby junctions
        (D_AMB01, J_NH3_SOUTH,      20.0, 60, 1.0, 1.1),
        (D_AMB02, J_EAST_BYPASS,    15.0, 60, 1.1, 1.0),
        (D_AMB03, J_NH3_SOUTH,      12.0, 55, 1.0, 1.2),
        (D_AMB03, J_WEST_GHT,        9.0, 50, 1.0, 1.3),
        (D_AMB04, J_EAST_BYPASS,    11.0, 60, 1.0, 1.0),
        (D_AMB04, H_SINNAR,         13.0, 55, 1.1, 1.0),
        (D_AMB05, J_DINDORI_X,       2.0, 50, 1.0, 1.0),
        (D_AMB05, H_DINDORI,        10.0, 60, 1.0, 1.0),

        # Hospitals internal connections
        (H_SINNAR,   J_EAST_BYPASS,   18.0, 60, 1.1, 1.0),
        (H_IGATPURI, J_NH3_SOUTH,     17.0, 50, 1.0, 1.3),
        (H_IGATPURI, J_WEST_GHT,       8.0, 45, 1.0, 1.4),
        (H_DINDORI,  J_DINDORI_X,     10.0, 60, 1.0, 1.0),
        (H_DINDORI,  J_NH3_NORTH,     12.0, 65, 1.0, 1.0),

        # Villages — local/dirt roads (slower)
        (V_GHOTI,    J_NH3_SOUTH,      9.0, 40, 1.0, 1.5),
        (V_GHOTI,    H_IGATPURI,      14.0, 40, 1.0, 1.6),
        (V_NIPHAD,   J_EAST_BYPASS,   14.0, 50, 1.1, 1.2),
        (V_NIPHAD,   H_SINNAR,        22.0, 55, 1.1, 1.1),
        (V_YEOLA,    J_EAST_BYPASS,   40.0, 55, 1.0, 1.1),
        (V_PETH,     J_WEST_GHT,      10.0, 35, 1.0, 1.8),
        (V_PETH,     H_IGATPURI,      20.0, 35, 1.0, 1.9),
        (V_CHANDWAD, J_NH3_NORTH,     25.0, 55, 1.0, 1.1),
        (V_CHANDWAD, V_KALWAN,        22.0, 45, 1.0, 1.4),
        (V_SURGANA,  J_NH3_NORTH,     37.0, 45, 1.0, 1.5),
        (V_SURGANA,  V_KALWAN,        12.0, 40, 1.0, 1.6),
        (V_KALWAN,   J_NH3_NORTH,     30.0, 50, 1.0, 1.3),
        (V_TRIMBAK,  J_WEST_GHT,       8.0, 40, 1.0, 1.4),
        (V_TRIMBAK,  J_NASHIK_CENTRAL, 29.0, 60, 1.0, 1.1),

        # Junctions cross-connect
        (J_NH3_NORTH, J_DINDORI_X,     9.0, 70, 1.0, 1.0),
        (J_NH3_SOUTH, J_WEST_GHT,     22.0, 60, 1.0, 1.1),
        (J_EAST_BYPASS, J_NH3_NORTH,  30.0, 65, 1.0, 1.0),
        (J_WEST_GHT, J_NASHIK_CENTRAL, 18.0, 55, 1.0, 1.2),
    ]

    for (u, v, dist, spd, traf, road) in edge_specs:
        graph.add_edge(GraphEdge(
            u=u, v=v,
            distance_km=dist,
            speed_limit_kmh=float(spd),
            traffic_factor=traf,
            road_condition_factor=road,
        ), bidirectional=True)

    # ── Hospitals ────────────────────────────────────────────────────────────
    hospitals = [
        Hospital(
            id=H_NASHIK,  name="Nashik District Hospital",  node_id=H_NASHIK,
            specialists=[MedicalSpecialty.CARDIOLOGY, MedicalSpecialty.TRAUMA, MedicalSpecialty.GENERAL_SURGERY],
            total_beds=20, available_beds=8,
            medicine_inventory={"Epinephrine": 15, "Morphine": 3, "Aspirin": 100, "Heparin": 20},
            current_queue_length=1, avg_treatment_time_mins=20.0,
        ),
        Hospital(
            id=H_SINNAR,  name="Sinnar Rural Medical Centre", node_id=H_SINNAR,
            specialists=[MedicalSpecialty.GENERAL_SURGERY, MedicalSpecialty.TRAUMA],
            total_beds=10, available_beds=3,
            medicine_inventory={"Epinephrine": 8, "Atropine": 4, "Aspirin": 60},
            current_queue_length=0, avg_treatment_time_mins=15.0,
        ),
        Hospital(
            id=H_IGATPURI, name="Igatpuri Primary Health", node_id=H_IGATPURI,
            specialists=[MedicalSpecialty.GENERAL_SURGERY, MedicalSpecialty.PEDIATRICS],
            total_beds=8, available_beds=5,
            medicine_inventory={"Paracetamol": 20, "Aspirin": 40},
            current_queue_length=0, avg_treatment_time_mins=10.0,
        ),
        Hospital(
            id=H_DINDORI, name="Dindori Community Hospital", node_id=H_DINDORI,
            specialists=[MedicalSpecialty.CARDIOLOGY, MedicalSpecialty.TRAUMA, MedicalSpecialty.NEUROLOGY],
            total_beds=12, available_beds=6,
            medicine_inventory={"Epinephrine": 12, "Morphine": 2, "Heparin": 15},
            current_queue_length=0, avg_treatment_time_mins=18.0,
        ),
    ]

    # ── Ambulances ───────────────────────────────────────────────────────────
    ambulances = [
        Ambulance(id="amb_01", name="Ambulance-1 (Nashik Central)",  base_node_id=D_AMB01, current_node_id=D_AMB01, lat=19.9500, lng=73.7600, speed_kmh=60.0),
        Ambulance(id="amb_02", name="Ambulance-2 (Nashik East)",     base_node_id=D_AMB02, current_node_id=D_AMB02, lat=20.0100, lng=73.8100, speed_kmh=65.0),
        Ambulance(id="amb_03", name="Ambulance-3 (Igatpuri Area)",   base_node_id=D_AMB03, current_node_id=D_AMB03, lat=19.8800, lng=73.7200, speed_kmh=60.0),
        Ambulance(id="amb_04", name="Ambulance-4 (Sinnar Road)",     base_node_id=D_AMB04, current_node_id=D_AMB04, lat=19.9200, lng=73.9000, speed_kmh=60.0),
        Ambulance(id="amb_05", name="Ambulance-5 (Dindori Road)",    base_node_id=D_AMB05, current_node_id=D_AMB05, lat=20.1500, lng=73.8000, speed_kmh=65.0),
    ]

    return graph, hospitals, ambulances


# ── Village routing: nearest graph node for each village ─────────────────────
VILLAGE_NODE_MAP = {
    "vil_01": "vil_01",   # Ghoti
    "vil_02": "vil_02",   # Niphad
    "vil_03": "vil_03",   # Yeola
    "vil_04": "vil_04",   # Peth
    "vil_05": "vil_05",   # Chandwad
    "vil_06": "vil_06",   # Surgana
    "vil_07": "vil_07",   # Kalwan
    "vil_08": "vil_08",   # Trimbakeshwar
}

# Specialties the simulation generates — mapped to engine enums
SPECIALTY_MAP = {
    "cardiology":    MedicalSpecialty.CARDIOLOGY,
    "trauma":        MedicalSpecialty.TRAUMA,
    "general":       MedicalSpecialty.GENERAL_SURGERY,
    "orthopaedics":  MedicalSpecialty.TRAUMA,   # closest match
    "neurology":     MedicalSpecialty.NEUROLOGY,
    "pediatrics":    MedicalSpecialty.PEDIATRICS,
}
