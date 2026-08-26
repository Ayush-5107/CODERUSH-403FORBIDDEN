#ifndef DISPATCH_ENGINE_HPP
#define DISPATCH_ENGINE_HPP

#include <vector>
#include <unordered_map>
#include <algorithm>
#include <memory>
#include "models.hpp"
#include "graph_engine.hpp"

class Dispatcher {
public:
    Graph graph;
    std::unordered_map<std::string, Hospital> hospitals;
    std::unordered_map<std::string, Ambulance> ambulances;
    std::vector<DispatchResult> history;

    Dispatcher(const Graph& g, const std::vector<Hospital>& hList, const std::vector<Ambulance>& aList)
        : graph(g) {
        for (auto& h : hList) hospitals[h.id] = h;
        for (auto& a : aList) ambulances[a.id] = a;
    }

    std::shared_ptr<DispatchResult> dispatch(const EmergencyRequest& req) {
        std::vector<LogEntry> logs;
        
        struct Candidate {
            double cost;
            std::string hospital_id;
            std::string ambulance_id;
            std::vector<std::string> pickup_path;
            std::vector<std::string> delivery_path;
            std::vector<std::string> visited_nodes;
            double pickup_time;
            double delivery_time;
            double queue_delay;
            int available_beds;
        };

        std::vector<Candidate> options;

        // Evaluate each hospital
        for (auto& pair : hospitals) {
            auto& hospital = pair.second;
            std::vector<std::string> rejections;

            // 1. Specialist check
            bool hasSpecialist = false;
            for (auto& s : hospital.specialists) {
                if (s == req.required_specialty) {
                    hasSpecialist = true;
                    break;
                }
            }
            if (!hasSpecialist) {
                std::string available = "";
                for (size_t i = 0; i < hospital.specialists.size(); ++i) {
                    available += hospital.specialists[i] + (i + 1 < hospital.specialists.size() ? ", " : "");
                }
                rejections.push_back("Lacks required specialist (" + req.required_specialty + "). Available: [" + available + "]");
            }

            // 2. Bed capacity check
            if (hospital.available_beds <= 0) {
                rejections.push_back("No available beds (Full capacity: " + std::to_string(hospital.total_beds) + "/" + std::to_string(hospital.total_beds) + ")");
            }

            // 3. Medicine inventory check
            for (auto& med : req.required_medicines) {
                int stock = hospital.medicine_stock.count(med.first) ? hospital.medicine_stock[med.first] : 0;
                if (stock < med.second) {
                    rejections.push_back("Insufficient medicine stock for '" + med.first + "' (Req: " + std::to_string(med.second) + ", Stock: " + std::to_string(stock) + ")");
                }
            }

            // Dijkstra route from village to hospital
            auto resDelivery = graph.dijkstra(req.village_id, hospital.node_id);
            double deliveryTime = resDelivery.travel_time;
            std::vector<std::string> deliveryPath = resDelivery.path;

            if (deliveryTime >= 1e9) {
                rejections.push_back("No viable road route to hospital");
            }

            double distKm = graph.getPathDistanceKm(deliveryPath);

            // Find closest available ambulance
            std::string bestAmbId = "";
            double minPickupTime = 1e9;
            std::vector<std::string> bestPickupPath;
            std::vector<std::string> bestVisitedNodes;

            for (auto& ambPair : ambulances) {
                auto& amb = ambPair.second;
                auto resPickup = graph.dijkstra(amb.current_node, req.village_id);
                if (resPickup.travel_time < minPickupTime) {
                    minPickupTime = resPickup.travel_time;
                    bestAmbId = amb.id;
                    bestPickupPath = resPickup.path;
                    bestVisitedNodes = resPickup.visited_nodes_in_order;
                }
            }

            // Combine visited nodes from pickup + delivery for visualizer
            bestVisitedNodes.insert(bestVisitedNodes.end(), resDelivery.visited_nodes_in_order.begin(), resDelivery.visited_nodes_in_order.end());

            if (bestAmbId.empty() || minPickupTime >= 1e9) {
                rejections.push_back("No reachable ambulance available");
            }

            double queueDelay = hospital.queue_count * hospital.avg_treatment_mins;
            double totalCost = minPickupTime + deliveryTime + queueDelay;

            if (!rejections.empty()) {
                logs.push_back({
                    hospital.id,
                    hospital.name,
                    distKm,
                    minPickupTime >= 1e9 ? 0.0 : minPickupTime,
                    deliveryTime >= 1e9 ? 0.0 : deliveryTime,
                    queueDelay,
                    totalCost >= 1e9 ? 999.0 : totalCost,
                    "REJECTED",
                    rejections
                });
            } else {
                logs.push_back({
                    hospital.id,
                    hospital.name,
                    distKm,
                    minPickupTime,
                    deliveryTime,
                    queueDelay,
                    totalCost,
                    "APPROVED",
                    {}
                });

                options.push_back({
                    totalCost,
                    hospital.id,
                    bestAmbId,
                    bestPickupPath,
                    deliveryPath,
                    bestVisitedNodes,
                    minPickupTime,
                    deliveryTime,
                    queueDelay,
                    hospital.available_beds
                });
            }
        }

        if (options.empty()) return nullptr;

        // Pick hospital with lowest total operational cost + multi-tier tie-breaking
        std::sort(options.begin(), options.end(), [](const Candidate& a, const Candidate& b) {
            if (std::abs(a.cost - b.cost) > 1e-6) {
                return a.cost < b.cost;
            }
            // Tie-Breaker Tier 1: Higher available bed capacity buffer
            if (a.available_beds != b.available_beds) {
                return a.available_beds > b.available_beds;
            }
            // Tie-Breaker Tier 2: Deterministic ID fallback
            return a.hospital_id < b.hospital_id;
        });

        auto best = options[0];
        auto& targetH = hospitals[best.hospital_id];
        auto& amb = ambulances[best.ambulance_id];

        // Deduct bed & medicines
        targetH.available_beds = std::max(0, targetH.available_beds - 1);
        targetH.queue_count++;
        amb.status = "BUSY";

        for (auto& med : req.required_medicines) {
            if (targetH.medicine_stock.count(med.first)) {
                targetH.medicine_stock[med.first] = std::max(0, targetH.medicine_stock[med.first] - med.second);
            }
        }

        auto result = std::make_shared<DispatchResult>();
        result->request_id = req.id;
        result->patient_village_id = req.village_id;
        result->target_hospital_id = targetH.id;
        result->target_hospital_name = targetH.name;
        result->assigned_ambulance_id = amb.id;
        result->pickup_path = best.pickup_path;
        result->delivery_path = best.delivery_path;
        result->visited_nodes_in_order = best.visited_nodes;
        result->pickup_time_mins = std::round(best.pickup_time * 100.0) / 100.0;
        result->delivery_time_mins = std::round(best.delivery_time * 100.0) / 100.0;
        result->queue_delay_mins = std::round(best.queue_delay * 100.0) / 100.0;
        result->total_trip_mins = std::round((best.pickup_time + best.delivery_time + best.queue_delay) * 100.0) / 100.0;
        result->logs = logs;
        result->geojson_pickup_route = graph.getCoordinatesPath(best.pickup_path);
        result->geojson_delivery_route = graph.getCoordinatesPath(best.delivery_path);
        
        auto resDeliveryExplored = graph.dijkstra(req.village_id, targetH.node_id);
        result->geojson_explored_edges = graph.getEdgesCoordinatesPath(resDeliveryExplored.visited_edges_in_order);
        
        // Calculate Algorithm Benchmarks (Dijkstra vs A* vs Bidirectional Dijkstra) for Hackathon Judges
        result->benchmarks = graph.runBenchmarks(req.village_id, targetH.node_id);

        history.push_back(*result);
        return result;
    }
};

#endif
