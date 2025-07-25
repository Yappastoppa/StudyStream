# GhostRacer AI Race Routes Feature

## Overview

This feature adds AI-generated race routes for New Jersey using real road network data from OpenStreetMap. The system generates scenic driving routes, loop circuits, and extreme racing paths based on actual road infrastructure.

## Architecture

### Backend Components

1. **Route Generator (Python)**
   - `server/route-generator.py` - Core route generation logic using OSMnx
   - Downloads real road network data from OpenStreetMap
   - Uses graph algorithms to generate interesting race routes
   - Exports routes as GeoJSON for easy visualization

2. **API Integration (TypeScript)**
   - `server/generate-nj-routes.ts` - TypeScript wrapper for Python script
   - Provides type-safe interfaces for route data
   - Handles caching and user route management

3. **API Endpoints**
   - `GET /api/routes/nj` - Get pre-generated NJ race routes
   - `POST /api/routes/nj/generate` - Generate new routes for specific areas
   - `GET /api/routes/user` - Get user-submitted routes
   - `POST /api/routes/user` - Save a user-generated route

### Frontend Components

1. **AI Routes Panel**
   - `client/src/components/racing/ai-routes.tsx` - Main UI component
   - Displays AI-generated and user routes in a sleek panel
   - Shows route details: distance, difficulty, roads traversed
   - Allows selection and visualization on the map

2. **Map Integration**
   - Routes are rendered as thick, glowing lines on Mapbox
   - Color coding: Orange for AI scenic, Pink for AI loops, Green for user routes
   - Click to select and zoom to route bounds
   - Trophy icon in map controls toggles the routes panel

## Route Types

### 1. AI Scenic Routes
- Long-distance routes through major roads
- Prioritizes highways and scenic drives
- Distance: 15-50km typically
- Difficulty based on road types

### 2. AI Loop Circuits
- Closed-loop routes for circuit racing
- Returns to starting point
- Distance: 10-30km typically
- Great for time trials

### 3. User-Generated Routes
- Custom routes created by users
- Can be shared with the community
- Stored separately from AI routes

## Technical Implementation

### Route Generation Algorithm
```python
# Simplified example
def generate_scenic_route(graph, min_distance, max_distance):
    # Find major road nodes
    major_nodes = find_major_road_nodes(graph)
    
    # Select random start/end from major nodes
    start = random.choice(major_nodes)
    end = random.choice(major_nodes)
    
    # Find shortest path (tends to use highways)
    route = nx.shortest_path(graph, start, end, weight='length')
    
    # Convert to GeoJSON LineString
    return create_geojson_feature(route)
```

### GeoJSON Format
```json
{
  "type": "Feature",
  "properties": {
    "name": "Jersey City Speedway Circuit",
    "description": "AI-generated 25.3km race route",
    "distance_km": 25.3,
    "distance_miles": 15.7,
    "roads": ["US Route 1", "NJ-440"],
    "type": "ai_generated",
    "difficulty": "hard"
  },
  "geometry": {
    "type": "LineString",
    "coordinates": [[-74.077, 40.728], ...]
  }
}
```

## Usage

### Viewing AI Routes
1. Click the Trophy icon in the map controls (bottom-right)
2. Browse available routes in the panel
3. Click a route to highlight it on the map
4. Map automatically zooms to show the full route

### Generating New Routes
1. Click "Generate New Routes" button in the AI Routes panel
2. Backend will generate routes for different NJ areas
3. New routes appear automatically in the list

### Future Enhancements

1. **User Route Recording**
   - Record actual driven routes
   - Save and share with community
   - Rate and review routes

2. **Route Leaderboards**
   - Fastest times per route
   - Most popular routes
   - User achievements

3. **Advanced Generation**
   - Scenic route preferences (coastal, mountain, urban)
   - Difficulty settings
   - Custom start/end points
   - Multi-waypoint routes

4. **Route Metadata**
   - Traffic patterns
   - Best time to drive
   - Weather considerations
   - Police activity warnings

## Dependencies

- **Python**: osmnx, networkx, geopandas, shapely
- **Frontend**: Mapbox GL JS, React Query
- **Data**: OpenStreetMap road network data

## Performance Considerations

- Route generation can take 10-30 seconds for complex areas
- Pre-generated routes are cached in `client/public/nj_race_routes.geojson`
- Frontend renders routes as map layers for smooth performance
- Large route collections (>20 routes) may impact map performance

## Security & Privacy

- No personal location data is stored with AI routes
- User routes can be submitted anonymously
- Route generation happens server-side to protect API keys
- All routes are public and shareable