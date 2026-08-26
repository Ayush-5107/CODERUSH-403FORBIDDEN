#ifndef SEED_DATA_HPP
#define SEED_DATA_HPP

#include <vector>
#include "models.hpp"
#include "graph_engine.hpp"

inline void loadDemoData(Graph& graph, std::vector<Hospital>& hospitals, std::vector<Ambulance>& ambulances) {
    // Nodes
    std::vector<Node> nodes = {
        {"Village_Alpha", "Village Alpha", "VILLAGE", 12.9716, 77.5946},
        {"Village_Beta", "Village Beta", "VILLAGE", 12.9800, 77.6100},
        {"Village_Gamma", "Village Gamma", "VILLAGE", 12.9500, 77.5700},
        {"Village_Delta", "Village Delta", "VILLAGE", 12.9900, 77.5500},
        
        {"Junction_Crossroads", "Crossroads Junction", "JUNCTION", 12.9650, 77.6000},
        {"Junction_North", "North Highway Pass", "JUNCTION", 13.0100, 77.6200},
        
        {"Base_Station_1", "Ambulance Depot 1 (Alpha Base)", "AMBULANCE_BASE", 12.9750, 77.5900},
        {"Base_Station_2", "Ambulance Depot 2 (East Base)", "AMBULANCE_BASE", 12.9600, 77.6400},

        {"Hospital_A", "Hospital A (District General)", "HOSPITAL", 12.9300, 77.5800},
        {"Hospital_B", "Hospital B (Plastic & Minor Care Clinic)", "HOSPITAL", 12.9850, 77.6300},
        {"Hospital_C", "Hospital C (Regional Cardiac & Super Specialty)", "HOSPITAL", 13.0500, 77.6800}
    };

    for (auto& n : nodes) graph.addNode(n);

    // Edges
    std::vector<Edge> edges = {
        {"Village_Alpha", "Base_Station_1", 2.5, 50.0, 1.0, 1.0, false},
        {"Village_Alpha", "Junction_Crossroads", 4.0, 60.0, 1.2, 1.0, false},
        
        {"Junction_Crossroads", "Hospital_A", 8.0, 60.0, 1.5, 1.0, false},
        {"Junction_Crossroads", "Hospital_B", 10.0, 50.0, 1.1, 1.2, false},
        {"Junction_Crossroads", "Village_Gamma", 6.0, 40.0, 2.0, 1.0, false},
        
        {"Hospital_B", "Junction_North", 8.0, 70.0, 1.0, 1.0, false},
        {"Junction_North", "Hospital_C", 17.0, 80.0, 1.0, 1.0, false},
        
        {"Base_Station_2", "Hospital_B", 3.0, 50.0, 1.0, 1.0, false},
        {"Base_Station_2", "Hospital_C", 22.0, 75.0, 1.0, 1.0, false},
        
        {"Village_Delta", "Junction_North", 12.0, 60.0, 1.0, 1.0, false},
        {"Village_Beta", "Hospital_B", 5.0, 50.0, 1.0, 1.0, false}
    };

    for (auto& e : edges) graph.addEdge(e, true);

    // Hospitals
    hospitals = {
        {
            "Hospital_A",
            "Hospital A (District General)",
            "Hospital_A",
            {"TRAUMA", "GENERAL_SURGERY", "PEDIATRICS"},
            10,
            0, // Depleted beds
            {{"Epinephrine", 20}, {"Aspirin", 100}},
            2,
            15.0
        },
        {
            "Hospital_B",
            "Hospital B (Plastic & Minor Care Clinic)",
            "Hospital_B",
            {"PLASTIC_SURGERY", "GENERAL_SURGERY"}, // Lacks Cardiology!
            8,
            5,
            {{"Aspirin", 50}, {"Bandages", 500}},
            0,
            10.0
        },
        {
            "Hospital_C",
            "Hospital C (Regional Cardiac & Super Specialty)",
            "Hospital_C",
            {"CARDIOLOGY", "NEUROLOGY", "TRAUMA", "GENERAL_SURGERY"},
            25,
            12,
            {{"Epinephrine", 50}, {"Aspirin", 200}, {"Morphine", 30}},
            1,
            20.0
        }
    };

    // Ambulances
    ambulances = {
        {
            "AMB-101",
            "Ambulance Alpha-1",
            "Base_Station_1",
            "IDLE",
            12.9750,
            77.5900
        },
        {
            "AMB-102",
            "Ambulance East-2",
            "Base_Station_2",
            "IDLE",
            12.9600,
            77.6400
        }
    };
}

#endif
