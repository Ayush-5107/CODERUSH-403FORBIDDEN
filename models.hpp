#ifndef MODELS_HPP
#define MODELS_HPP

#include <string>
#include <vector>
#include <map>
#include <cmath>
#include "json.hpp"

using json = nlohmann::json;

struct Node {
    std::string id;
    std::string name;
    std::string type; // VILLAGE, HOSPITAL, AMBULANCE_BASE, JUNCTION
    double lat;
    double lng;

    json to_json() const {
        return {
            {"id", id},
            {"name", name},
            {"type", type},
            {"lat", lat},
            {"lng", lng}
        };
    }
};

struct Edge {
    std::string u;
    std::string v;
    double distance_km;
    double speed_limit_kmh = 60.0;
    double road_condition_factor = 1.0; // 1.0 = paved, 1.5 = unpaved, 2.0 = flood/pothole
    double traffic_factor = 1.0;        // 1.0 = clear, 2.0 = heavy congestion
    bool is_blocked = false;            // Road blockage flag

    double getTravelTime() const {
        if (is_blocked) return 1e9;
        double effective_speed = speed_limit_kmh / (road_condition_factor * traffic_factor);
        if (effective_speed <= 1.0) effective_speed = 1.0;
        return (distance_km / effective_speed) * 60.0; // Travel time in minutes
    }

    json to_json() const {
        return {
            {"u", u},
            {"v", v},
            {"distance_km", distance_km},
            {"speed_limit_kmh", speed_limit_kmh},
            {"road_condition_factor", road_condition_factor},
            {"traffic_factor", traffic_factor},
            {"is_blocked", is_blocked},
            {"travel_time_mins", getTravelTime()}
        };
    }
};

struct Hospital {
    std::string id;
    std::string name;
    std::string node_id;
    std::vector<std::string> specialists;
    int total_beds;
    int available_beds;
    std::map<std::string, int> medicine_stock;
    int queue_count;
    double avg_treatment_mins;

    json to_json() const {
        return {
            {"id", id},
            {"name", name},
            {"node_id", node_id},
            {"specialists", specialists},
            {"total_beds", total_beds},
            {"available_beds", available_beds},
            {"medicine_stock", medicine_stock},
            {"current_queue_length", queue_count},
            {"avg_treatment_time_mins", avg_treatment_mins}
        };
    }
};

struct Ambulance {
    std::string id;
    std::string name;
    std::string current_node;
    std::string status = "IDLE"; // IDLE, BUSY
    double lat;
    double lng;

    json to_json() const {
        return {
            {"id", id},
            {"name", name},
            {"base_node_id", current_node},
            {"current_node_id", current_node},
            {"status", status},
            {"lat", lat},
            {"lng", lng}
        };
    }
};

struct EmergencyRequest {
    std::string id;
    std::string village_id;
    std::string patient_name;
    std::string condition;
    int urgency = 1; // 1 = Critical, 2 = Urgent, 3 = Moderate
    std::string required_specialty;
    std::map<std::string, int> required_medicines;
};

struct LogEntry {
    std::string hospital_id;
    std::string hospital_name;
    double distance_km;
    double pickup_mins;
    double hospital_travel_mins;
    double queue_delay_mins;
    double total_cost_mins;
    std::string status; // APPROVED / REJECTED
    std::vector<std::string> rejection_reasons;

    json to_json() const {
        return {
            {"hospital_id", hospital_id},
            {"hospital_name", hospital_name},
            {"distance_km", distance_km},
            {"pickup_time_mins", pickup_mins},
            {"hospital_travel_time_mins", hospital_travel_mins},
            {"hospital_queue_delay_mins", queue_delay_mins},
            {"total_cost_mins", total_cost_mins},
            {"status", status},
            {"rejection_reasons", rejection_reasons}
        };
    }
};

struct AlgorithmBenchmark {
    int dijkstra_nodes_explored = 0;
    int bidirectional_nodes_explored = 0;
    int astar_nodes_explored = 0;
    double astar_efficiency_gain_pct = 0.0;

    json to_json() const {
        return {
            {"dijkstra_nodes_explored", dijkstra_nodes_explored},
            {"bidirectional_dijkstra_nodes_explored", bidirectional_nodes_explored},
            {"astar_nodes_explored", astar_nodes_explored},
            {"astar_efficiency_gain_pct", astar_efficiency_gain_pct}
        };
    }
};

struct DispatchResult {
    std::string request_id;
    std::string patient_village_id;
    std::string target_hospital_id;
    std::string target_hospital_name;
    std::string assigned_ambulance_id;
    std::vector<std::string> pickup_path;
    std::vector<std::string> delivery_path;
    std::vector<std::string> visited_nodes_in_order;
    double pickup_time_mins;
    double delivery_time_mins;
    double queue_delay_mins;
    double total_trip_mins;
    std::vector<LogEntry> logs;
    std::vector<std::vector<double>> geojson_pickup_route;
    std::vector<std::vector<double>> geojson_delivery_route;
    std::vector<std::vector<std::vector<double>>> geojson_explored_edges;
    AlgorithmBenchmark benchmarks;

    json to_json() const {
        json log_array = json::array();
        for (const auto& log : logs) log_array.push_back(log.to_json());

        return {
            {"request_id", request_id},
            {"patient_village_id", patient_village_id},
            {"target_hospital_id", target_hospital_id},
            {"target_hospital_name", target_hospital_name},
            {"assigned_ambulance_id", assigned_ambulance_id},
            {"pickup_path_nodes", pickup_path},
            {"delivery_path_nodes", delivery_path},
            {"visited_nodes_in_order", visited_nodes_in_order},
            {"pickup_time_mins", pickup_time_mins},
            {"delivery_time_mins", delivery_time_mins},
            {"hospital_queue_delay_mins", queue_delay_mins},
            {"total_trip_mins", total_trip_mins},
            {"evaluation_logs", log_array},
            {"geojson_pickup_route", geojson_pickup_route},
            {"geojson_delivery_route", geojson_delivery_route},
            {"geojson_explored_edges", geojson_explored_edges},
            {"algorithm_benchmarks", benchmarks.to_json()}
        };
    }
};

#endif
