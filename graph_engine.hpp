#ifndef GRAPH_ENGINE_HPP
#define GRAPH_ENGINE_HPP

#include <vector>
#include <unordered_map>
#include <queue>
#include <algorithm>
#include <cmath>
#include "models.hpp"

struct DijkstraResult {
    double travel_time;
    std::vector<std::string> path;
    std::vector<std::string> visited_nodes_in_order;
    std::vector<std::pair<std::string, std::string>> visited_edges_in_order;
    int nodes_explored_count = 0;
};

class Graph {
public:
    std::unordered_map<std::string, Node> nodes;
    std::unordered_map<std::string, std::vector<Edge>> adj;

    void addNode(const Node& node) {
        nodes[node.id] = node;
        adj[node.id] = {};
    }

    void addEdge(const Edge& edge, bool twoWay = true) {
        adj[edge.u].push_back(edge);
        if (twoWay) {
            Edge rev = edge;
            rev.u = edge.v;
            rev.v = edge.u;
            adj[edge.v].push_back(rev);
        }
    }

    // Heuristic function for A*: Haversine straight-line travel time lower-bound (Admissible)
    double heuristicMins(const std::string& u_id, const std::string& target_id) const {
        if (!nodes.count(u_id) || !nodes.count(target_id)) return 0.0;
        const auto& u = nodes.at(u_id);
        const auto& t = nodes.at(target_id);

        constexpr double R = 6371.0; // Earth radius in km
        double dLat = (t.lat - u.lat) * 3.141592653589793 / 180.0;
        double dLng = (t.lng - u.lng) * 3.141592653589793 / 180.0;

        double a = std::sin(dLat / 2.0) * std::sin(dLat / 2.0) +
                   std::cos(u.lat * 3.141592653589793 / 180.0) * std::cos(t.lat * 3.141592653589793 / 180.0) *
                   std::sin(dLng / 2.0) * std::sin(dLng / 2.0);
        
        double c = 2.0 * std::atan2(std::sqrt(a), std::sqrt(1.0 - a));
        double distKm = R * c;

        // Max possible speed 80 km/h -> travel time in minutes (Admissible lower bound)
        return (distKm / 80.0) * 60.0;
    }

    // 1. Standard Single-Source Dijkstra Algorithm
    DijkstraResult dijkstra(std::string start, std::string target) {
        if (nodes.find(start) == nodes.end() || nodes.find(target) == nodes.end()) {
            return {1e9, {}, {}, {}, 0};
        }
        if (start == target) return {0.0, {start}, {start}, {}, 1};

        std::unordered_map<std::string, double> dist;
        std::unordered_map<std::string, std::string> parent;
        std::vector<std::string> visitedOrder;
        std::vector<std::pair<std::string, std::string>> visitedEdges;

        for (auto& p : nodes) dist[p.first] = 1e9;

        using P = std::pair<double, std::string>;
        std::priority_queue<P, std::vector<P>, std::greater<P>> pq;

        dist[start] = 0.0;
        pq.push({0.0, start});

        while (!pq.empty()) {
            auto [d, u] = pq.top();
            pq.pop();

            if (d > dist[u]) continue;
            visitedOrder.push_back(u);

            if (u == target) break;

            for (auto& edge : adj[u]) {
                if (edge.is_blocked) continue;
                
                double weight = edge.getTravelTime();
                if (d + weight < dist[edge.v]) {
                    dist[edge.v] = d + weight;
                    parent[edge.v] = u;
                    visitedEdges.push_back({u, edge.v});
                    pq.push({dist[edge.v], edge.v});
                }
            }
        }

        if (dist[target] >= 1e9) {
            return {1e9, {}, visitedOrder, visitedEdges, static_cast<int>(visitedOrder.size())};
        }

        std::vector<std::string> path;
        for (std::string curr = target; !curr.empty(); curr = parent[curr]) {
            path.push_back(curr);
            if (curr == start) break;
        }
        std::reverse(path.begin(), path.end());

        return {dist[target], path, visitedOrder, visitedEdges, static_cast<int>(visitedOrder.size())};
    }

    // 2. A* (A-Star) Pathfinding Algorithm
    DijkstraResult aStar(std::string start, std::string target) {
        if (nodes.find(start) == nodes.end() || nodes.find(target) == nodes.end()) {
            return {1e9, {}, {}, {}, 0};
        }
        if (start == target) return {0.0, {start}, {start}, {}, 1};

        std::unordered_map<std::string, double> gScore;
        std::unordered_map<std::string, double> fScore;
        std::unordered_map<std::string, std::string> parent;
        std::vector<std::string> visitedOrder;
        std::vector<std::pair<std::string, std::string>> visitedEdges;

        for (auto& p : nodes) {
            gScore[p.first] = 1e9;
            fScore[p.first] = 1e9;
        }

        using P = std::pair<double, std::string>;
        std::priority_queue<P, std::vector<P>, std::greater<P>> pq;

        gScore[start] = 0.0;
        fScore[start] = heuristicMins(start, target);
        pq.push({fScore[start], start});

        while (!pq.empty()) {
            auto [f, u] = pq.top();
            pq.pop();

            if (f > fScore[u]) continue;
            visitedOrder.push_back(u);

            if (u == target) break;

            for (auto& edge : adj[u]) {
                if (edge.is_blocked) continue;

                double tentative_g = gScore[u] + edge.getTravelTime();
                if (tentative_g < gScore[edge.v]) {
                    parent[edge.v] = u;
                    gScore[edge.v] = tentative_g;
                    fScore[edge.v] = tentative_g + heuristicMins(edge.v, target);
                    visitedEdges.push_back({u, edge.v});
                    pq.push({fScore[edge.v], edge.v});
                }
            }
        }

        if (gScore[target] >= 1e9) {
            return {1e9, {}, visitedOrder, visitedEdges, static_cast<int>(visitedOrder.size())};
        }

        std::vector<std::string> path;
        for (std::string curr = target; !curr.empty(); curr = parent[curr]) {
            path.push_back(curr);
            if (curr == start) break;
        }
        std::reverse(path.begin(), path.end());

        return {gScore[target], path, visitedOrder, visitedEdges, static_cast<int>(visitedOrder.size())};
    }

    // 3. Bidirectional Dijkstra Algorithm
    DijkstraResult bidirectionalDijkstra(std::string start, std::string target) {
        if (nodes.find(start) == nodes.end() || nodes.find(target) == nodes.end()) {
            return {1e9, {}, {}, {}, 0};
        }
        if (start == target) return {0.0, {start}, {start}, {}, 1};

        std::unordered_map<std::string, double> distF, distB;
        std::unordered_map<std::string, std::string> parentF, parentB;
        std::vector<std::string> visitedOrder;
        std::vector<std::pair<std::string, std::string>> visitedEdges;

        for (auto& p : nodes) {
            distF[p.first] = 1e9;
            distB[p.first] = 1e9;
        }

        using P = std::pair<double, std::string>;
        std::priority_queue<P, std::vector<P>, std::greater<P>> pqF, pqB;

        distF[start] = 0.0;
        distB[target] = 0.0;
        pqF.push({0.0, start});
        pqB.push({0.0, target});

        std::string meetingNode = "";
        double bestDist = 1e9;

        while (!pqF.empty() && !pqB.empty()) {
            // Forward step
            if (!pqF.empty()) {
                auto [d, u] = pqF.top();
                pqF.pop();
                if (d <= distF[u]) {
                    visitedOrder.push_back(u);
                    if (distB[u] < 1e9 && d + distB[u] < bestDist) {
                        bestDist = d + distB[u];
                        meetingNode = u;
                    }
                    for (auto& edge : adj[u]) {
                        if (edge.is_blocked) continue;
                        double w = edge.getTravelTime();
                        if (d + w < distF[edge.v]) {
                            distF[edge.v] = d + w;
                            parentF[edge.v] = u;
                            visitedEdges.push_back({u, edge.v});
                            pqF.push({distF[edge.v], edge.v});
                        }
                    }
                }
            }

            // Backward step
            if (!pqB.empty()) {
                auto [d, u] = pqB.top();
                pqB.pop();
                if (d <= distB[u]) {
                    visitedOrder.push_back(u);
                    if (distF[u] < 1e9 && d + distF[u] < bestDist) {
                        bestDist = d + distF[u];
                        meetingNode = u;
                    }
                    for (auto& edge : adj[u]) {
                        if (edge.is_blocked) continue;
                        double w = edge.getTravelTime();
                        if (d + w < distB[edge.v]) {
                            distB[edge.v] = d + w;
                            parentB[edge.v] = u;
                            visitedEdges.push_back({u, edge.v});
                            pqB.push({distB[edge.v], edge.v});
                        }
                    }
                }
            }

            if (!meetingNode.empty() && pqF.top().first + pqB.top().first >= bestDist) {
                break;
            }
        }

        if (meetingNode.empty() || bestDist >= 1e9) {
            return {1e9, {}, visitedOrder, visitedEdges, static_cast<int>(visitedOrder.size())};
        }

        // Reconstruct forward path (start -> meetingNode)
        std::vector<std::string> pathF;
        for (std::string curr = meetingNode; !curr.empty(); curr = parentF[curr]) {
            pathF.push_back(curr);
            if (curr == start) break;
        }
        std::reverse(pathF.begin(), pathF.end());

        // Reconstruct backward path (meetingNode -> target)
        std::vector<std::string> pathB;
        for (std::string curr = parentB[meetingNode]; !curr.empty(); curr = parentB[curr]) {
            pathB.push_back(curr);
            if (curr == target) break;
        }

        pathF.insert(pathF.end(), pathB.begin(), pathB.end());

        return {bestDist, pathF, visitedOrder, visitedEdges, static_cast<int>(visitedOrder.size())};
    }

    // Benchmark comparison runner for Hackathon Judge Presentations!
    AlgorithmBenchmark runBenchmarks(std::string start, std::string target) {
        auto resDijkstra = dijkstra(start, target);
        auto resBi = bidirectionalDijkstra(start, target);
        auto resAStar = aStar(start, target);

        double gain = 0.0;
        if (resDijkstra.nodes_explored_count > 0) {
            gain = ((double)(resDijkstra.nodes_explored_count - resAStar.nodes_explored_count) / resDijkstra.nodes_explored_count) * 100.0;
        }

        return {
            resDijkstra.nodes_explored_count,
            resBi.nodes_explored_count,
            resAStar.nodes_explored_count,
            std::round(gain * 10.0) / 10.0
        };
    }

    double getPathDistanceKm(const std::vector<std::string>& path) {
        double distSum = 0.0;
        for (size_t i = 0; i + 1 < path.size(); ++i) {
            std::string u = path[i], v = path[i + 1];
            for (auto& edge : adj[u]) {
                if (edge.v == v) {
                    distSum += edge.distance_km;
                    break;
                }
            }
        }
        return distSum;
    }

    std::vector<std::vector<double>> getCoordinatesPath(const std::vector<std::string>& path) {
        std::vector<std::vector<double>> coords;
        for (auto& id : path) {
            if (nodes.count(id)) {
                coords.push_back({nodes[id].lat, nodes[id].lng});
            }
        }
        return coords;
    }

    std::vector<std::vector<std::vector<double>>> getEdgesCoordinatesPath(const std::vector<std::pair<std::string, std::string>>& edges) {
        std::vector<std::vector<std::vector<double>>> segments;
        for (auto& pair : edges) {
            if (nodes.count(pair.first) && nodes.count(pair.second)) {
                segments.push_back({
                    {nodes[pair.first].lat, nodes[pair.first].lng},
                    {nodes[pair.second].lat, nodes[pair.second].lng}
                });
            }
        }
        return segments;
    }
};

#endif
