"""
Graph Engine & Shortest Path Algorithms.
Implements custom Dijkstra and A* pathfinding algorithms over dynamic, weighted road networks.
Supports dynamic edge weighting (traffic, road degradation) and multi-destination path calculation.
"""

import heapq
import math
from typing import Dict, List, Tuple, Optional
from models import GraphNode, GraphEdge


class RuralRoadGraph:
    """
    Weighted Graph representation for rural road networks using an Adjacency List.
    Edges are dynamically weighted based on distance, traffic conditions, and road quality.
    """

    def __init__(self):
        self.nodes: Dict[str, GraphNode] = {}
        self.adj_list: Dict[str, List[GraphEdge]] = {}

    def add_node(self, node: GraphNode):
        """Add a village, hospital, ambulance base, or junction node."""
        self.nodes[node.id] = node
        if node.id not in self.adj_list:
            self.adj_list[node.id] = []

    def add_edge(self, edge: GraphEdge, bidirectional: bool = True):
        """Add a weighted edge between two nodes."""
        if edge.u not in self.adj_list:
            self.adj_list[edge.u] = []
        self.adj_list[edge.u].append(edge)

        if bidirectional:
            reverse_edge = GraphEdge(
                u=edge.v,
                v=edge.u,
                distance_km=edge.distance_km,
                speed_limit_kmh=edge.speed_limit_kmh,
                traffic_factor=edge.traffic_factor,
                road_condition_factor=edge.road_condition_factor,
                is_blocked=edge.is_blocked
            )
            if edge.v not in self.adj_list:
                self.adj_list[edge.v] = []
            self.adj_list[edge.v].append(reverse_edge)

    def update_edge_conditions(self, u: str, v: str, traffic_factor: Optional[float] = None, 
                               road_condition_factor: Optional[float] = None, is_blocked: Optional[bool] = None):
        """Dynamically update edge weights during live simulation."""
        for node_id in [u, v]:
            if node_id in self.adj_list:
                for edge in self.adj_list[node_id]:
                    if (edge.u == u and edge.v == v) or (edge.u == v and edge.v == u):
                        if traffic_factor is not None:
                            edge.traffic_factor = traffic_factor
                        if road_condition_factor is not None:
                            edge.road_condition_factor = road_condition_factor
                        if is_blocked is not None:
                            edge.is_blocked = is_blocked

    def dijkstra(self, start_node_id: str, target_node_id: str) -> Tuple[float, List[str]]:
        """
        Custom priority-queue Dijkstra algorithm to find the fastest travel path.
        Returns:
            Tuple[float, List[str]]: (Total travel time in minutes, Path of node IDs)
        
        Time Complexity: O((E + V) log V) using Python's Min-Heap `heapq`.
        Space Complexity: O(V) for distances and visited tracking.
        """
        if start_node_id not in self.nodes or target_node_id not in self.nodes:
            return float('inf'), []

        if start_node_id == target_node_id:
            return 0.0, [start_node_id]

        # Priority Queue stores tuples of (current_accumulated_time, current_node_id)
        pq: List[Tuple[float, str]] = [(0.0, start_node_id)]
        distances: Dict[str, float] = {node_id: float('inf') for node_id in self.nodes}
        predecessors: Dict[str, Optional[str]] = {node_id: None for node_id in self.nodes}
        
        distances[start_node_id] = 0.0
        visited = set()

        while pq:
            current_time, current_node = heapq.heappop(pq)

            if current_node in visited:
                continue
            visited.add(current_node)

            if current_node == target_node_id:
                break

            for edge in self.adj_list.get(current_node, []):
                if edge.is_blocked:
                    continue

                neighbor = edge.v
                weight = edge.travel_time_minutes

                if weight == float('inf'):
                    continue

                new_time = current_time + weight
                if new_time < distances[neighbor]:
                    distances[neighbor] = new_time
                    predecessors[neighbor] = current_node
                    heapq.heappush(pq, (new_time, neighbor))

        # Reconstruct path
        if distances[target_node_id] == float('inf'):
            return float('inf'), []

        path = []
        curr: Optional[str] = target_node_id
        while curr is not None:
            path.append(curr)
            curr = predecessors[curr]
        path.reverse()

        return distances[target_node_id], path

    def haversine_heuristic(self, node1_id: str, node2_id: str, avg_speed_kmh: float = 60.0) -> float:
        """
        Haversine formula to compute straight-line geographical distance heuristic for A* search.
        Returns estimated travel time in minutes.
        """
        n1 = self.nodes.get(node1_id)
        n2 = self.nodes.get(node2_id)
        if not n1 or not n2:
            return 0.0

        R = 6371.0  # Earth's radius in kilometers
        dlat = math.radians(n2.lat - n1.lat)
        dlng = math.radians(n2.lng - n1.lng)
        
        a = (math.sin(dlat / 2) ** 2 + 
             math.cos(math.radians(n1.lat)) * math.cos(math.radians(n2.lat)) * math.sin(dlng / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance_km = R * c
        
        return (distance_km / avg_speed_kmh) * 60.0

    def a_star(self, start_node_id: str, target_node_id: str) -> Tuple[float, List[str]]:
        """
        A* Shortest Path search algorithm using Haversine heuristic for faster spatial search.
        Returns:
            Tuple[float, List[str]]: (Total travel time in minutes, Path of node IDs)
        """
        if start_node_id not in self.nodes or target_node_id not in self.nodes:
            return float('inf'), []

        if start_node_id == target_node_id:
            return 0.0, [start_node_id]

        # Priority Queue stores tuples: (f_score, g_score, current_node_id)
        start_h = self.haversine_heuristic(start_node_id, target_node_id)
        pq: List[Tuple[float, float, str]] = [(start_h, 0.0, start_node_id)]
        
        g_scores: Dict[str, float] = {node_id: float('inf') for node_id in self.nodes}
        g_scores[start_node_id] = 0.0
        predecessors: Dict[str, Optional[str]] = {node_id: None for node_id in self.nodes}
        visited = set()

        while pq:
            _, current_g, current_node = heapq.heappop(pq)

            if current_node in visited:
                continue
            visited.add(current_node)

            if current_node == target_node_id:
                break

            for edge in self.adj_list.get(current_node, []):
                if edge.is_blocked:
                    continue

                neighbor = edge.v
                weight = edge.travel_time_minutes
                tentative_g = current_g + weight

                if tentative_g < g_scores[neighbor]:
                    g_scores[neighbor] = tentative_g
                    predecessors[neighbor] = current_node
                    f_score = tentative_g + self.haversine_heuristic(neighbor, target_node_id)
                    heapq.heappush(pq, (f_score, tentative_g, neighbor))

        if g_scores[target_node_id] == float('inf'):
            return float('inf'), []

        path = []
        curr: Optional[str] = target_node_id
        while curr is not None:
            path.append(curr)
            curr = predecessors[curr]
        path.reverse()

        return g_scores[target_node_id], path

    def get_coordinates_path(self, node_path: List[str]) -> List[List[float]]:
        """Convert a list of node IDs into a list of [lat, lng] coordinates for map polyline rendering."""
        coords = []
        for n_id in node_path:
            if n_id in self.nodes:
                node = self.nodes[n_id]
                coords.append([node.lat, node.lng])
        return coords

    def calculate_path_distance_km(self, node_path: List[str]) -> float:
        """Calculate cumulative road distance in km along a given node path."""
        total_dist = 0.0
        for i in range(len(node_path) - 1):
            u_id, v_id = node_path[i], node_path[i+1]
            for edge in self.adj_list.get(u_id, []):
                if edge.v == v_id:
                    total_dist += edge.distance_km
                    break
        return total_dist
