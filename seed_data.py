"""
Seed Data & Mock Scenario Generator.
Generates a realistic rural healthcare network topology with villages, hospitals,
ambulance depots, and dynamic road edges for hackathon testing and UI demonstration.
"""

from typing import Tuple, List
from models import GraphNode, GraphEdge, NodeType, Hospital, Ambulance, AmbulanceStatus, MedicalSpecialty
from graph_engine import RuralRoadGraph


def create_demo_network() -> Tuple[RuralRoadGraph, List[Hospital], List[Ambulance]]:
    """
    Constructs the standard rural healthcare graph.
    Scenario Setup:
    - Village_Alpha requests urgent CARDIOLOGY care.
    - Hospital_B is close (~10km) BUT only has PLASTIC_SURGERY & GENERAL_SURGERY (No Cardiology).
    - Hospital_C is further (~25km) BUT has CARDIOLOGY and 8 available beds.
    - Hospital_A is ~15km away with TRAUMA & SURGERY, but 0 available beds.
    """
    graph = RuralRoadGraph()

    # 1. Define Nodes (Villages, Hospitals, Ambulance Depots, Junctions)
    nodes = [
        # Villages
        GraphNode(id="Village_Alpha", name="Village Alpha", type=NodeType.VILLAGE, lat=12.9716, lng=77.5946),
        GraphNode(id="Village_Beta", name="Village Beta", type=NodeType.VILLAGE, lat=12.9800, lng=77.6100),
        GraphNode(id="Village_Gamma", name="Village Gamma", type=NodeType.VILLAGE, lat=12.9500, lng=77.5700),
        GraphNode(id="Village_Delta", name="Village Delta", type=NodeType.VILLAGE, lat=12.9900, lng=77.5500),
        
        # Junctions / Intersections
        GraphNode(id="Junction_Crossroads", name="Crossroads Junction", type=NodeType.JUNCTION, lat=12.9650, lng=77.6000),
        GraphNode(id="Junction_North", name="North Highway Pass", type=NodeType.JUNCTION, lat=13.0100, lng=77.6200),
        
        # Ambulance Bases
        GraphNode(id="Base_Station_1", name="Ambulance Depot 1 (Alpha Base)", type=NodeType.AMBULANCE_BASE, lat=12.9750, lng=77.5900),
        GraphNode(id="Base_Station_2", name="Ambulance Depot 2 (East Base)", type=NodeType.AMBULANCE_BASE, lat=12.9600, lng=77.6400),

        # Hospitals
        GraphNode(id="Hospital_A", name="Hospital A (District General)", type=NodeType.HOSPITAL, lat=12.9300, lng=77.5800),
        GraphNode(id="Hospital_B", name="Hospital B (Plastic & Minor Care Clinic)", type=NodeType.HOSPITAL, lat=12.9850, lng=77.6300),
        GraphNode(id="Hospital_C", name="Hospital C (Regional Cardiac & Super Specialty)", type=NodeType.HOSPITAL, lat=13.0500, lng=77.6800),
    ]

    for n in nodes:
        graph.add_node(n)

    # 2. Define Road Network Edges
    edges = [
        # Village Alpha -> Junction
        GraphEdge(u="Village_Alpha", v="Base_Station_1", distance_km=2.5, speed_limit_kmh=50.0, traffic_factor=1.0),
        GraphEdge(u="Village_Alpha", v="Junction_Crossroads", distance_km=4.0, speed_limit_kmh=60.0, traffic_factor=1.2),
        
        # Junction Crossroads Connections
        GraphEdge(u="Junction_Crossroads", v="Hospital_A", distance_km=8.0, speed_limit_kmh=60.0, traffic_factor=1.5),
        GraphEdge(u="Junction_Crossroads", v="Hospital_B", distance_km=10.0, speed_limit_kmh=50.0, traffic_factor=1.1, road_condition_factor=1.2),
        GraphEdge(u="Junction_Crossroads", v="Village_Gamma", distance_km=6.0, speed_limit_kmh=40.0, traffic_factor=2.0), # Heavy traffic
        
        # North Highway to Hospital C
        GraphEdge(u="Hospital_B", v="Junction_North", distance_km=8.0, speed_limit_kmh=70.0, traffic_factor=1.0),
        GraphEdge(u="Junction_North", v="Hospital_C", distance_km=17.0, speed_limit_kmh=80.0, traffic_factor=1.0),
        
        # Direct Base Station 2 to East
        GraphEdge(u="Base_Station_2", v="Hospital_B", distance_km=3.0, speed_limit_kmh=50.0, traffic_factor=1.0),
        GraphEdge(u="Base_Station_2", v="Hospital_C", distance_km=22.0, speed_limit_kmh=75.0, traffic_factor=1.0),
        
        # Connecting Village Delta & Beta
        GraphEdge(u="Village_Delta", v="Junction_North", distance_km=12.0, speed_limit_kmh=60.0, traffic_factor=1.0),
        GraphEdge(u="Village_Beta", v="Hospital_B", distance_km=5.0, speed_limit_kmh=50.0, traffic_factor=1.0),
    ]

    for e in edges:
        graph.add_edge(e, bidirectional=True)

    # 3. Define Hospitals
    hospitals = [
        Hospital(
            id="Hospital_A",
            name="Hospital A (District General)",
            node_id="Hospital_A",
            specialists=[MedicalSpecialty.TRAUMA, MedicalSpecialty.GENERAL_SURGERY, MedicalSpecialty.PEDIATRICS],
            total_beds=10,
            available_beds=0, # Full capacity
            medicine_inventory={"Epinephrine": 20, "Aspirin": 100, "Morphine": 5},
            current_queue_length=2
        ),
        Hospital(
            id="Hospital_B",
            name="Hospital B (Plastic & Minor Care Clinic)",
            node_id="Hospital_B",
            specialists=[MedicalSpecialty.PLASTIC_SURGERY, MedicalSpecialty.GENERAL_SURGERY],
            total_beds=8,
            available_beds=5,
            medicine_inventory={"Aspirin": 50, "Bandages": 500},
            current_queue_length=0
        ),
        Hospital(
            id="Hospital_C",
            name="Hospital C (Regional Cardiac & Super Specialty)",
            node_id="Hospital_C",
            specialists=[MedicalSpecialty.CARDIOLOGY, MedicalSpecialty.NEUROLOGY, MedicalSpecialty.TRAUMA, MedicalSpecialty.GENERAL_SURGERY],
            total_beds=25,
            available_beds=12,
            medicine_inventory={"Epinephrine": 50, "Aspirin": 200, "Morphine": 30, "Heparin": 40},
            current_queue_length=1
        )
    ]

    # 4. Define Ambulances
    ambulances = [
        Ambulance(
            id="AMB-101",
            name="Ambulance Alpha-1",
            base_node_id="Base_Station_1",
            current_node_id="Base_Station_1",
            status=AmbulanceStatus.IDLE,
            speed_kmh=60.0,
            lat=12.9750,
            lng=77.5900
        ),
        Ambulance(
            id="AMB-102",
            name="Ambulance East-2",
            base_node_id="Base_Station_2",
            current_node_id="Base_Station_2",
            status=AmbulanceStatus.IDLE,
            speed_kmh=65.0,
            lat=12.9600,
            lng=77.6400
        )
    ]

    return graph, hospitals, ambulances
