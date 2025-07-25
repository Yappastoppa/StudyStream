# GhostRacer - Privacy-Focused Racing Web App

## Overview

GhostRacer is a progressive web application (PWA) designed for privacy-focused street racing enthusiasts. The application provides real-time GPS tracking, competitor detection, crowdsourced alerts, and anonymous communication features while prioritizing user privacy and security through invite-only access and data obfuscation.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### January 25, 2025 (Enterprise Navigation System - Complete Implementation)
- **Full Enterprise-Grade Navigation Feature Parity**: Achieved complete feature matching with Waze/Google Maps
  - ✓ Alternative Route Selection: Multiple route options with real-time comparison and traffic data
  - ✓ Voice Turn-by-Turn Navigation: Speech synthesis with customizable voice announcements
  - ✓ Lane-Level Guidance: Banner instructions with lane indicators showing which lanes to use
  - ✓ Offline Route Caching: Download routes for navigation without internet connectivity
  - ✓ Enhanced Navigation Hook: Advanced routing with alternatives, voice, and banner instructions
  - ✓ Professional Map Integration: All components seamlessly integrated into racing map interface
  - ✓ Real-time Route Comparison: Display multiple routes with time/distance differences
  - ✓ Voice Controls: Toggle voice guidance with speed-based announcements
  - ✓ Lane Visualization: Dynamic lane arrows showing valid and active lanes for turns
  - ✓ Offline Management: Cache routes with map tiles, manage storage, and handle expiration

### January 25, 2025 (Professional Navigation UI - Part 4)
- **Enhanced Navigation System**: Integrated professional navigation patterns from open-source projects
  - ✓ Professional Navigation UI: Enterprise-grade navigation interface inspired by React Native Mapbox Navigation
  - ✓ Guidance Simulator: Route playback system with speed controls and visual tracking (based on Mapbox guidance simulator)
  - ✓ Dual Navigation Modes: Toggle between Waze-style and Professional UI during navigation
  - ✓ Enhanced Turn Instructions: Improved maneuver icons, distance formatting, and instruction clarity
  - ✓ Speed Monitoring: Real-time speed tracking with speeding alerts and speed limit display
  - ✓ Upcoming Steps Preview: Expandable side panel showing next 5 navigation steps
  - ✓ Advanced Playback Controls: Route simulation with seek, speed adjustment, and voice toggle
  - ✓ Professional Map Markers: Enhanced position tracking and route visualization
  - ✓ Navigation patterns adapted from MapLibre GL Directions and React Native Mapbox Navigation open-source projects

### January 25, 2025 (Final Update - Part 3)
- **Completed All GhostRacer Feature Expansion Requirements**:
  - ✓ Route Creator: Draw custom routes on map, save with metadata (name, difficulty, tags)
  - ✓ Simulation Mode: Populate map with fake racers and alerts for UI testing
  - ✓ Activity Heatmap: Visualize racing hotspots with color-coded density overlay
  - ✓ Route Leaderboard: Track fastest times per route with rankings
  - ✓ Enhanced map controls with dedicated buttons for each feature
  - ✓ All features match the racing theme with neon accents and dark UI

### January 25, 2025 (Evening Update - Part 2)
- **AI Race Routes Feature**: Implemented advanced race route generation for New Jersey
  - Python-based route generator using OSMnx and real OpenStreetMap data
  - Three route types: AI scenic routes, AI loop circuits, user-generated routes
  - Routes displayed as glowing lines on map (orange/pink/green color coding)
  - Trophy icon toggles AI Routes panel showing all available routes
  - Route details include distance, difficulty, road names, and type
  - API endpoints for fetching and generating new routes
  - Pre-generated sample routes for Jersey City, Liberty State Park, and Newark areas

### January 25, 2025 (Evening Update - Part 1)
- **UI/UX Overhaul**: Implemented modern racing interface with dark theme and neon accents
- **Navigation System**: Added comprehensive route planning with Mapbox Directions API
  - Turn-by-turn navigation with real-time routing
  - Navigation panel with route options (avoid highways/tolls)
  - Click-to-set start and destination points
  - Route visualization with glowing effect
- **Map Controls**: Reorganized into floating vertical panels (bottom-right)
  - Map style switcher (Dark/Satellite/Navigation)
  - Traffic and density toggles with subtle overlays
  - Navigation mode and route drawing tools
- **Route Overlays**: Added key location markers for drivers
  - Speed trap warnings
  - Safe parking locations
  - Fuel stations
  - Scenic driving routes
- **UI Improvements**:
  - Floating speedometer with glow effect (bottom-left)
  - Minimal header bar with online/offline status
  - Reduced visual clutter with icon-based controls
  - Responsive design for mobile and desktop

### January 25, 2025 (Morning)
- Fixed critical server startup issues (TypeScript errors in storage layer)
- Resolved API endpoint connectivity problems
- Server now running successfully on port 5000 with all endpoints functional
- Identified GPS location access limitation in Replit preview iframe
- App requires opening in new browser tab for proper GPS functionality
- Mapbox token still requires refresh from user's account for live map data

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Styling**: Tailwind CSS with dark racing theme and custom CSS variables
- **UI Components**: Radix UI component library with custom racing-themed components
- **State Management**: React Query for server state management and React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Maps**: Mapbox GL JS for interactive mapping with WebGL rendering
- **PWA Features**: Service worker for offline functionality and app-like experience

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Real-time Communication**: WebSocket server using the 'ws' library for live updates
- **API Design**: RESTful API with WebSocket integration for real-time features
- **Development**: Vite middleware integration for hot module replacement

### Database Layer
- **ORM**: Drizzle ORM with TypeScript schema definitions
- **Database**: PostgreSQL with PostGIS for geospatial operations
- **Provider**: Neon Database (serverless PostgreSQL)
- **Schema**: Shared TypeScript schema between client and server
- **Migrations**: Drizzle Kit for database migrations and schema management

## Key Components

### Authentication System
- **Invite-only access** using time-limited invite codes (48-hour expiration)
- **Anonymous usernames** generated automatically (e.g., "Phantom_#9X2B")
- **No email or personal data** collection for maximum privacy
- **JWT-based session** management stored in localStorage

### Real-time Communication
- **WebSocket connections** for live position updates and alerts
- **Proximity-based messaging** to nearby users within configurable radius
- **Event synchronization** for coordinated race starts with server-side timing
- **Connection management** with automatic reconnection and heartbeat monitoring

### Privacy Features
- **Ghost Mode** toggle to hide user presence while still receiving alerts
- **Location fuzzing** to 100-meter precision for anonymity
- **Ephemeral data** with automatic cleanup of old location data
- **Anti-spy mechanisms** including shadowbanning and idle detection

### Racing Features
- **Speed tracking** using browser geolocation API with high accuracy
- **Distance calculation** for race statistics and leaderboards
- **Event creation** for challenges between users (sprint, circuit, time trial)
- **Countdown synchronization** for fair race starts across devices

### Navigation Features
- **Enterprise-Grade Route Planning** with multiple alternative routes and real-time comparison
- **Voice Turn-by-Turn Navigation** with speech synthesis and customizable announcements
- **Lane-Level Guidance** using Mapbox banner instructions with visual lane indicators
- **Offline Route Caching** with map tile storage for navigation without connectivity
- **Advanced Route Options** including avoid highways, avoid tolls, fastest route with traffic data
- **Real-time Route Alternatives** showing multiple paths with time and traffic differences
- **Professional Navigation Interface** with floating overlays and enhanced 3D perspective
- **Voice Controls** with speed-based announcements and toggle functionality
- **Enhanced Route Visualization** with glowing effects and professional styling
- **Offline Management System** for downloading, storing, and managing cached routes

### AI Race Routes
- **Automatic Route Generation** using OSMnx Python library with OpenStreetMap data
- **Multiple Route Types** including scenic highways, loop circuits, and extreme paths
- **Real Road Networks** from New Jersey with accurate distance and road information
- **Interactive Visualization** with color-coded routes on Mapbox (orange/pink/green)
- **Route Details Panel** showing distance, difficulty, roads traversed, and type
- **API Endpoints** for fetching pre-generated routes and creating new ones
- **User Route Submission** allowing community-generated favorite routes
- **Caching System** for improved performance with pre-generated route files

### Alert System
- **Crowdsourced reporting** of cameras, checkpoints, and hazards
- **Real-time broadcast** to nearby users based on proximity
- **Alert management** with automatic expiration and user reporting

## Data Flow

1. **User Authentication**: Invite code validation → JWT generation → WebSocket connection establishment
2. **Location Updates**: Geolocation API → fuzzing → WebSocket broadcast → proximity filtering → client updates
3. **Alert Flow**: User report → validation → fuzzing → proximity broadcast → map marker rendering
4. **Event Creation**: Challenge creation → target user notification → acceptance/rejection → synchronized countdown → race tracking

## External Dependencies

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety and enhanced developer experience
- **ESBuild**: Fast bundling for production builds

### UI/UX Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library for consistent iconography
- **React Hook Form**: Form state management and validation

### Mapping and Geolocation
- **Mapbox GL JS**: Interactive maps with vector tiles and WebGL rendering
- **Browser Geolocation API**: High-accuracy position tracking
- **Turf.js**: Geospatial calculations for distance and proximity

### Real-time Features
- **WebSocket (ws)**: Bidirectional real-time communication
- **React Query**: Server state management and caching
- **Session Management**: PostgreSQL session store for persistence

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with hot module replacement
- **Database**: Neon Database with connection pooling
- **Environment Variables**: DATABASE_URL and Mapbox tokens
- **WebSocket**: Integrated with HTTP server for development

### Production Considerations
- **Static Assets**: Vite build output optimized for CDN delivery
- **Database**: PostgreSQL with PostGIS extension for geospatial queries
- **SSL Requirements**: HTTPS required for geolocation API access
- **Service Worker**: Offline functionality and app caching
- **WebSocket Scaling**: Consider using Redis for multi-instance deployments

### Performance Optimizations
- **Map Tile Caching**: Offline map tiles for reduced bandwidth
- **Location Throttling**: Rate-limited position updates to prevent spam
- **Data Cleanup**: Automatic removal of expired alerts and inactive users
- **Connection Pooling**: Efficient database connection management

The application emphasizes privacy, performance, and real-time collaboration while maintaining a sleek racing aesthetic suitable for enthusiast communities.