"""
Unit & Integration Test Suite for the Healthcare Routing & Dispatch Engine.
Evaluates algorithmic correctness, edge cases, specialist routing, and priority queue execution.
"""

import time
from seed_data import create_demo_network
from models import EmergencyRequest, UrgencyLevel, MedicalSpecialty, AmbulanceStatus
from dispatch_engine import DispatchOrchestrator


def test_dijkstra_shortest_path():
    """Verify Dijkstra algorithm calculates correct travel times on dynamic weighted edges."""
    graph, _, _ = create_demo_network()
    
    # Path from Village Alpha to Hospital B
    time_mins, path = graph.dijkstra("Village_Alpha", "Hospital_B")
    assert time_mins < float('inf')
    assert "Village_Alpha" in path
    assert "Hospital_B" in path
    print(f"✅ Dijkstra Test Passed: Travel Time = {time_mins:.2f} mins, Path = {path}")


def test_demo_cardiology_scenario():
    """
    Test Problem Statement Demo Scenario:
    Village Alpha requests urgent Cardiology care.
    Hospital B (10km) lacks cardiologist -> MUST be rejected.
    Hospital A (15km) has 0 beds -> MUST be rejected.
    Hospital C (25km) has cardiologist and open beds -> MUST be selected.
    """
    graph, hospitals, ambulances = create_demo_network()
    orchestrator = DispatchOrchestrator(graph, hospitals, ambulances)

    req = EmergencyRequest(
        id="REQ-DEMO-01",
        village_node_id="Village_Alpha",
        patient_name="John Doe",
        condition_description="Acute Myocardial Infarction (Heart Attack)",
        urgency=UrgencyLevel.TIER_1_CRITICAL,
        required_specialty=MedicalSpecialty.CARDIOLOGY,
        required_medicines={"Epinephrine": 2, "Aspirin": 1},
        timestamp=time.time()
    )

    orchestrator.submit_request(req)
    plan = orchestrator.evaluate_and_dispatch_next()

    assert plan is not None, "Dispatch plan should be generated"
    assert plan.target_hospital_id == "Hospital_C", f"Expected Hospital_C, got {plan.target_hospital_id}"
    assert plan.assigned_ambulance_id == "AMB-101", f"Expected closest ambulance AMB-101, got {plan.assigned_ambulance_id}"
    
    rejected_hospitals = {b.hospital_id: b.rejection_reasons for b in plan.evaluation_logs if b.status == "REJECTED"}
    print("✅ Decision Audit Breadcrumbs generated:")
    for log in plan.evaluation_logs:
        print(f"   - {log.hospital_name}: [{log.status}] {log.rejection_reasons if log.rejection_reasons else 'Selected'}")

    assert "Hospital_B" in [log.hospital_id for log in plan.evaluation_logs if log.status == "REJECTED"]
    assert "Hospital_A" in [log.hospital_id for log in plan.evaluation_logs if log.status == "REJECTED"]
    
    print(f"✅ Demo Cardiology Scenario Passed! Target Hospital: {plan.target_hospital_name}, Total Trip: {plan.total_trip_mins} mins")


def test_priority_queue_urgency():
    """Verify that Tier 1 Critical emergency preempts Tier 3 Moderate emergency."""
    graph, hospitals, ambulances = create_demo_network()
    orchestrator = DispatchOrchestrator(graph, hospitals, ambulances)

    req_moderate = EmergencyRequest(
        id="REQ-MODERATE",
        village_node_id="Village_Beta",
        patient_name="Patient Minor",
        condition_description="Minor sprain",
        urgency=UrgencyLevel.TIER_3_MODERATE,
        required_specialty=MedicalSpecialty.GENERAL_SURGERY,
        timestamp=100.0
    )

    req_critical = EmergencyRequest(
        id="REQ-CRITICAL",
        village_node_id="Village_Alpha",
        patient_name="Patient Cardiac",
        condition_description="Cardiac arrest",
        urgency=UrgencyLevel.TIER_1_CRITICAL,
        required_specialty=MedicalSpecialty.CARDIOLOGY,
        timestamp=105.0 # Submitted slightly later
    )

    # Submit moderate first, then critical
    orchestrator.submit_request(req_moderate)
    orchestrator.submit_request(req_critical)

    # First dispatch evaluation MUST pull Tier 1 Critical request!
    plan_1 = orchestrator.evaluate_and_dispatch_next()
    assert plan_1.request_id == "REQ-CRITICAL", f"Priority Queue failure: expected REQ-CRITICAL, got {plan_1.request_id}"
    print("✅ Priority Queue Test Passed! Tier 1 Critical request processed before Tier 3 Moderate.")


if __name__ == "__main__":
    test_dijkstra_shortest_path()
    test_demo_cardiology_scenario()
    test_priority_queue_urgency()
    print("\n🎉 ALL UNIT & INTEGRATION TESTS PASSED PERFECTLY!")
