# GhostRacer - Privacy-Focused Racing Web App

## Overview

GhostRacer is a progressive web application (PWA) designed for privacy-focused street racing enthusiasts. The application provides real-time GPS tracking, competitor detection, crowdsourced alerts, and anonymous communication features while prioritizing user privacy and security through invite-only access and data obfuscation.

## User Preferences

Preferred communication style: Simple, everyday language.

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