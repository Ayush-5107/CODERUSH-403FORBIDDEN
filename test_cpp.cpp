#include <iostream>
#include <cassert>
#include "models.hpp"
#include "graph_engine.hpp"
#include "dispatch_engine.hpp"
#include "seed_data.hpp"

void testDijkstra() {
    Graph graph;
    std::vector<Hospital> hospitals;
    std::vector<Ambulance> ambulances;
    loadDemoData(graph, hospitals, ambulances);

    auto res = graph.dijkstra("Village_Alpha", "Hospital_B");
    assert(res.travel_time < 1e9);
    assert(!res.path.empty());
    assert(res.path.front() == "Village_Alpha");
    assert(res.path.back() == "Hospital_B");

    std::cout << "✅ Dijkstra Test Passed! Travel time: " << res.travel_time << " mins\n";
}

void testDemoScenario() {
    Graph graph;
    std::vector<Hospital> hospitals;
    std::vector<Ambulance> ambulances;
    loadDemoData(graph, hospitals, ambulances);

    Dispatcher dispatcher(graph, hospitals, ambulances);

    EmergencyRequest req;
    req.id = "DEMO-CARDIAC-01";
    req.village_id = "Village_Alpha";
    req.patient_name = "Jane Doe";
    req.condition = "Cardiac Emergency";
    req.urgency = 1;
    req.required_specialty = "CARDIOLOGY";
    req.required_medicines = {{"Epinephrine", 2}};

    auto result = dispatcher.dispatch(req);

    assert(result != nullptr);
    assert(result->target_hospital_id == "Hospital_C");
    assert(result->assigned_ambulance_id == "AMB-101");

    std::cout << "✅ Demo Scenario Passed! Target Hospital: " << result->target_hospital_name 
              << " | Total Trip: " << result->total_trip_mins << " mins\n";
}

int main() {
    testDijkstra();
    testDemoScenario();
    std::cout << "\n🎉 ALL TESTS PASSED!\n";
    return 0;
}
