#include <iostream>
#include <memory>
#include <chrono>
#include "httplib.h"
#include "json.hpp"
#include "models.hpp"
#include "graph_engine.hpp"
#include "dispatch_engine.hpp"
#include "seed_data.hpp"

using json = nlohmann::json;

int main() {
    Graph graph;
    std::vector<Hospital> hospitals;
    std::vector<Ambulance> ambulances;

    loadDemoData(graph, hospitals, ambulances);
    auto dispatcher = std::make_shared<Dispatcher>(graph, hospitals, ambulances);

    httplib::Server svr;

    auto setCors = [](httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    };

    svr.Options(R"(.*)", [setCors](const httplib::Request& req, httplib::Response& res) {
        setCors(res);
        res.status = 200;
    });

    // GET /api/network
    svr.Get("/api/network", [dispatcher, setCors](const httplib::Request& req, httplib::Response& res) {
        setCors(res);
        json nodes_arr = json::array();
        for (auto& pair : dispatcher->graph.nodes) {
            nodes_arr.push_back(pair.second.to_json());
        }

        json edges_arr = json::array();
        for (auto& pair : dispatcher->graph.adj) {
            for (auto& edge : pair.second) {
                edges_arr.push_back(edge.to_json());
            }
        }

        json response = {{"nodes", nodes_arr}, {"edges", edges_arr}};
        res.set_content(response.dump(2), "application/json");
    });

    // GET /api/hospitals
    svr.Get("/api/hospitals", [dispatcher, setCors](const httplib::Request& req, httplib::Response& res) {
        setCors(res);
        json arr = json::array();
        for (auto& pair : dispatcher->hospitals) arr.push_back(pair.second.to_json());
        res.set_content(arr.dump(2), "application/json");
    });

    // GET /api/ambulances
    svr.Get("/api/ambulances", [dispatcher, setCors](const httplib::Request& req, httplib::Response& res) {
        setCors(res);
        json arr = json::array();
        for (auto& pair : dispatcher->ambulances) arr.push_back(pair.second.to_json());
        res.set_content(arr.dump(2), "application/json");
    });

    // POST /api/emergency
    svr.Post("/api/emergency", [dispatcher, setCors](const httplib::Request& req, httplib::Response& res) {
        setCors(res);
        try {
            auto body = json::parse(req.body);

            static int count = 100;
            EmergencyRequest request;
            request.id = "REQ-" + std::to_string(++count);
            request.village_id = body.value("village_node_id", "Village_Alpha");
            request.patient_name = body.value("patient_name", "Emergency Patient");
            request.condition = body.value("condition_description", "Cardiac Emergency");
            request.urgency = body.value("urgency_tier", 1);
            request.required_specialty = body.value("required_specialty", "CARDIOLOGY");
            
            if (body.contains("required_medicines")) {
                request.required_medicines = body["required_medicines"].get<std::map<std::string, int>>();
            }

            auto result = dispatcher->dispatch(request);
            if (result) {
                res.set_content(result->to_json().dump(2), "application/json");
            } else {
                json err = {{"status", "UNSERVICEABLE"}, {"message", "No suitable hospital/ambulance available."}};
                res.set_content(err.dump(2), "application/json");
            }
        } catch (const std::exception& e) {
            res.status = 400;
            json err = {{"error", e.what()}};
            res.set_content(err.dump(2), "application/json");
        }
    });

    // POST /api/scenario/demo (Hackathon Cardiology Emergency Demo - Idempotent)
    svr.Post("/api/scenario/demo", [graph, hospitals, ambulances, setCors](const httplib::Request& req, httplib::Response& res) {
        setCors(res);
        
        // Fresh demo dispatcher snapshot for idempotent demo execution
        Dispatcher demoDispatcher(graph, hospitals, ambulances);

        EmergencyRequest demoReq;
        demoReq.id = "DEMO-CARDIAC-01";
        demoReq.village_id = "Village_Alpha";
        demoReq.patient_name = "Patient (Cardiac Arrest)";
        demoReq.condition = "Acute Chest Pain / Myocardial Infarction";
        demoReq.urgency = 1;
        demoReq.required_specialty = "CARDIOLOGY";
        demoReq.required_medicines = {{"Epinephrine", 2}, {"Aspirin", 1}};

        auto result = demoDispatcher.dispatch(demoReq);
        if (result) {
            res.set_content(result->to_json().dump(2), "application/json");
        } else {
            json err = {{"status", "FAILED"}, {"message", "Could not dispatch demo scenario."}};
            res.set_content(err.dump(2), "application/json");
        }
    });

    // GET /api/decision_logs
    svr.Get("/api/decision_logs", [dispatcher, setCors](const httplib::Request& req, httplib::Response& res) {
        setCors(res);
        json logs = json::array();
        for (auto& item : dispatcher->history) logs.push_back(item.to_json());
        res.set_content(logs.dump(2), "application/json");
    });

    std::cout << "Server running on http://localhost:8000\n";
    svr.listen("0.0.0.0", 8000);
    return 0;
}
