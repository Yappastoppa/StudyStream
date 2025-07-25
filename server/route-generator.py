#!/usr/bin/env python3
"""
GhostRacer Route Generator for New Jersey
Generates AI-powered race routes using OSMnx and NetworkX

This module downloads real road network data from OpenStreetMap
and generates exciting race routes using graph algorithms.
"""

import os
import json
import osmnx as ox
import networkx as nx
import geopandas as gpd
from shapely.geometry import LineString, Point
import random
from typing import List, Dict, Tuple, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure OSMnx
ox.config(use_cache=True, log_console=True)

class NJRouteGenerator:
    """Generates race routes for New Jersey using real road network data"""
    
    def __init__(self, place: str = "Jersey City, New Jersey, USA"):
        """
        Initialize the route generator
        
        Args:
            place: Location to download road network for (default: Jersey City)
        """
        self.place = place
        self.graph = None
        self.nodes_gdf = None
        self.edges_gdf = None
        
    def download_road_network(self):
        """Download the driving network for the specified place"""
        logger.info(f"Downloading road network for {self.place}...")
        
        # Download drivable road network
        self.graph = ox.graph_from_place(
            self.place,
            network_type='drive',
            simplify=True
        )
        
        # Convert to GeoDataFrames for easier manipulation
        self.nodes_gdf, self.edges_gdf = ox.graph_to_gdfs(self.graph)
        
        logger.info(f"Downloaded {len(self.graph.nodes)} nodes and {len(self.graph.edges)} edges")
        
    def generate_scenic_route(self, min_distance: float = 10000, max_distance: float = 50000) -> Optional[Dict]:
        """
        Generate a scenic race route using graph algorithms
        
        Args:
            min_distance: Minimum route distance in meters
            max_distance: Maximum route distance in meters
            
        Returns:
            GeoJSON feature dictionary or None if no route found
        """
        if not self.graph:
            self.download_road_network()
            
        # Find nodes that are likely to be interesting (near major roads)
        major_edges = self.edges_gdf[
            (self.edges_gdf['highway'].isin(['motorway', 'trunk', 'primary', 'secondary'])) |
            (self.edges_gdf['maxspeed'].astype(str).str.extract('(\d+)', expand=False).astype(float) >= 45)
        ]
        
        # Get unique nodes from major edges
        major_nodes = set()
        for idx, edge in major_edges.iterrows():
            major_nodes.add(idx[0])
            major_nodes.add(idx[1])
        
        major_nodes_list = list(major_nodes)
        
        if len(major_nodes_list) < 2:
            logger.warning("Not enough major nodes found")
            return None
            
        # Try multiple times to find a good route
        best_route = None
        best_distance = 0
        
        for _ in range(20):
            # Random start and end points from major nodes
            start_node = random.choice(major_nodes_list)
            end_node = random.choice(major_nodes_list)
            
            if start_node == end_node:
                continue
                
            try:
                # Find shortest path (which on major roads tends to be scenic)
                route = nx.shortest_path(
                    self.graph, 
                    start_node, 
                    end_node, 
                    weight='length'
                )
                
                # Calculate total distance
                distance = ox.utils_graph.get_route_edge_attributes(
                    self.graph, route, 'length'
                )
                total_distance = sum(distance)
                
                # Check if distance is in desired range
                if min_distance <= total_distance <= max_distance:
                    if total_distance > best_distance:
                        best_route = route
                        best_distance = total_distance
                        
            except nx.NetworkXNoPath:
                continue
                
        if not best_route:
            logger.warning("Could not find suitable route")
            return None
            
        # Convert route to LineString geometry
        route_coords = []
        for node in best_route:
            point = self.nodes_gdf.loc[node]
            route_coords.append((point['x'], point['y']))
            
        route_line = LineString(route_coords)
        
        # Get route metadata
        route_edges = ox.utils_graph.get_route_edge_attributes(
            self.graph, best_route, ['highway', 'name', 'maxspeed']
        )
        
        # Extract unique road names
        road_names = set()
        for edge_attrs in route_edges:
            if isinstance(edge_attrs.get('name'), str):
                road_names.add(edge_attrs['name'])
            elif isinstance(edge_attrs.get('name'), list):
                road_names.update(edge_attrs['name'])
                
        # Create GeoJSON feature
        feature = {
            "type": "Feature",
            "properties": {
                "name": f"NJ Scenic Route #{random.randint(1000, 9999)}",
                "description": f"AI-generated {best_distance/1000:.1f}km race route through {self.place}",
                "distance_km": best_distance / 1000,
                "distance_miles": best_distance / 1609.34,
                "roads": list(road_names)[:10],  # Top 10 road names
                "type": "ai_generated",
                "difficulty": self._calculate_difficulty(route_edges)
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [[x, y] for x, y in route_line.coords]
            }
        }
        
        return feature
        
    def generate_loop_route(self, center_point: Tuple[float, float] = None, 
                          radius: float = 5000) -> Optional[Dict]:
        """
        Generate a loop race route around a center point
        
        Args:
            center_point: (lon, lat) tuple or None for random center
            radius: Search radius in meters
            
        Returns:
            GeoJSON feature dictionary or None if no route found
        """
        if not self.graph:
            self.download_road_network()
            
        # Use random center if not provided
        if not center_point:
            center_node = random.choice(list(self.graph.nodes))
            center_data = self.nodes_gdf.loc[center_node]
            center_point = (center_data['x'], center_data['y'])
            
        # Find nodes within radius
        center_geom = Point(center_point)
        nearby_nodes = []
        
        for node, data in self.nodes_gdf.iterrows():
            node_point = Point(data['x'], data['y'])
            if center_geom.distance(node_point) * 111000 <= radius:  # Rough meters conversion
                nearby_nodes.append(node)
                
        if len(nearby_nodes) < 4:
            logger.warning("Not enough nodes for loop route")
            return None
            
        # Try to create a loop by visiting multiple waypoints
        waypoints = random.sample(nearby_nodes, min(4, len(nearby_nodes)))
        
        # Create route visiting all waypoints and returning to start
        full_route = []
        total_distance = 0
        
        for i in range(len(waypoints)):
            start = waypoints[i]
            end = waypoints[(i + 1) % len(waypoints)]
            
            try:
                segment = nx.shortest_path(
                    self.graph, start, end, weight='length'
                )
                
                if i > 0:
                    segment = segment[1:]  # Remove duplicate node
                    
                full_route.extend(segment)
                
                # Calculate segment distance
                distance = ox.utils_graph.get_route_edge_attributes(
                    self.graph, segment, 'length'
                )
                total_distance += sum(distance)
                
            except nx.NetworkXNoPath:
                logger.warning(f"No path between waypoints {start} and {end}")
                return None
                
        # Convert to LineString
        route_coords = []
        for node in full_route:
            point = self.nodes_gdf.loc[node]
            route_coords.append((point['x'], point['y']))
            
        route_line = LineString(route_coords)
        
        # Create GeoJSON feature
        feature = {
            "type": "Feature",
            "properties": {
                "name": f"NJ Circuit #{random.randint(1000, 9999)}",
                "description": f"AI-generated {total_distance/1000:.1f}km loop circuit",
                "distance_km": total_distance / 1000,
                "distance_miles": total_distance / 1609.34,
                "type": "ai_loop",
                "loop": True,
                "center": center_point
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [[x, y] for x, y in route_line.coords]
            }
        }
        
        return feature
        
    def _calculate_difficulty(self, route_edges: List[Dict]) -> str:
        """Calculate route difficulty based on road types and speeds"""
        highway_types = [edge.get('highway', '') for edge in route_edges]
        
        # Count different road types
        motorway_count = sum(1 for h in highway_types if h in ['motorway', 'motorway_link'])
        primary_count = sum(1 for h in highway_types if h in ['primary', 'trunk'])
        
        total = len(highway_types)
        if total == 0:
            return "medium"
            
        # High difficulty = lots of highways/motorways
        if motorway_count / total > 0.5:
            return "extreme"
        elif (motorway_count + primary_count) / total > 0.6:
            return "hard"
        elif primary_count / total > 0.4:
            return "medium"
        else:
            return "easy"
            
    def generate_multiple_routes(self, num_routes: int = 5) -> Dict:
        """
        Generate multiple race routes with different characteristics
        
        Args:
            num_routes: Number of routes to generate
            
        Returns:
            GeoJSON FeatureCollection
        """
        features = []
        
        # Generate mix of scenic and loop routes
        for i in range(num_routes):
            route = None
            
            if i % 2 == 0:
                # Scenic route
                route = self.generate_scenic_route(
                    min_distance=15000 + random.randint(-5000, 10000),
                    max_distance=50000 + random.randint(-10000, 20000)
                )
            else:
                # Loop route
                route = self.generate_loop_route(
                    radius=3000 + random.randint(1000, 5000)
                )
                
            if route:
                features.append(route)
                
        return {
            "type": "FeatureCollection",
            "features": features
        }
        
    def save_routes(self, output_path: str = "nj_race_routes.geojson"):
        """Generate and save routes to GeoJSON file"""
        routes = self.generate_multiple_routes(num_routes=5)
        
        with open(output_path, 'w') as f:
            json.dump(routes, f, indent=2)
            
        logger.info(f"Saved {len(routes['features'])} routes to {output_path}")
        return routes


# Command-line interface
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate NJ race routes")
    parser.add_argument("--place", default="Jersey City, New Jersey, USA", 
                       help="Place to generate routes for")
    parser.add_argument("--output", default="client/public/nj_race_routes.geojson",
                       help="Output GeoJSON file path")
    parser.add_argument("--routes", type=int, default=5,
                       help="Number of routes to generate")
    
    args = parser.parse_args()
    
    # Generate routes
    generator = NJRouteGenerator(place=args.place)
    generator.download_road_network()
    
    # Generate and save
    routes = generator.generate_multiple_routes(num_routes=args.routes)
    
    # Save to file
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, 'w') as f:
        json.dump(routes, f, indent=2)
        
    print(f"Generated {len(routes['features'])} routes and saved to {args.output}")