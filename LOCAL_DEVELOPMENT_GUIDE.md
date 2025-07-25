# GhostRacer Local Development Guide

## Overview
Your app is a unified full-stack application where the Express server serves both the API and the Vite-built frontend. Unlike typical setups with separate frontend/backend servers, this runs as a single server on port 5000.

## Project Structure
```
ghostracer/
├── client/                 # React frontend (Vite)
├── server/                 # Express backend + WebSocket
├── shared/                 # Shared TypeScript schemas
├── vite.config.ts         # Vite config (serves from /client)
├── package.json           # Single package.json for entire app
├── .env.local             # Environment variables
└── LOCAL_DEVELOPMENT_GUIDE.md
```

## Step 1: Install Dependencies

```bash
# Navigate to your project directory
cd ghostracer

# Install all dependencies (both frontend and backend)
npm install

# If you encounter permission issues on Mac:
sudo npm install

# Alternative using yarn (if you prefer):
yarn install
```

## Step 2: Set Up Environment Variables

Create `.env.local` in your **project root** (not in client/ or server/):

```bash
# Create the file
touch .env.local

# Edit with your preferred editor
nano .env.local
# OR
code .env.local
```

Add this content to `.env.local`:
```env
# Mapbox Configuration
VITE_MAPBOX_TOKEN=pk.eyJ1IjoiczR6b28iLCJhIjoiY21kaHZ1dW45MDV4MjJpb3NxOWl1OHJ2dCJ9.rSxPZ2e6JWgc0Uj12cjKRA

# Development Port (optional - defaults to 5000)
PORT=5000

# Node Environment
NODE_ENV=development
```

**Important Notes:**
- Use your actual working Mapbox token
- The `VITE_` prefix is required for Vite to expose it to the frontend
- No quotes needed around the token value

## Step 3: Start the Application

Your app runs as a **single unified server** that serves both API and frontend:

```bash
# Start the development server
npm run dev

# This command runs: NODE_ENV=development tsx server/index.ts
# Which starts Express + Vite middleware + WebSocket server
```

**What happens:**
1. Express server starts on port 5000
2. Vite middleware serves React app with HMR
3. WebSocket server initializes for real-time features  
4. Admin invite code `ADMIN2025` is auto-created

## Step 4: Access Your Application

Open your browser to:
```
http://localhost:5000
```

**NOT** `http://localhost:5173` (typical Vite port) - your app serves everything through port 5000.

## Step 5: Verify Mapbox Integration

1. **Enter invite code**: Use `ADMIN2025` on the login screen
2. **Check console**: Press F12 → Console tab
3. **Look for**: `✅ Map loaded successfully!` (not "simulation mode")
4. **GPS permission**: Allow location access when prompted
5. **Map interaction**: You should see the dark racing-themed map with navigation controls

## Development Workflow

### Single Terminal (Recommended)
```bash
npm run dev
```

### Alternative: Manual TypeScript Watch (if needed)
```bash
# Terminal 1: Main app
npm run dev

# Terminal 2: TypeScript checking (optional)
npm run check -- --watch
```

### Database Operations
```bash
# Push schema changes to database
npm run db:push

# TypeScript type checking
npm run check
```

## Troubleshooting

### 1. Port Already in Use
```bash
# Find process using port 5000
lsof -ti:5000

# Kill the process
kill $(lsof -ti:5000)

# Or kill all node processes
pkill -f node
```

### 2. Map Shows "Simulation Mode"
**Symptoms:** Black screen with "Loading GPS Map..." or grid interface
**Solutions:**
```bash
# Check if env var is loaded
echo $VITE_MAPBOX_TOKEN

# Verify token format (should start with pk.)
curl -s "https://api.mapbox.com/styles/v1/mapbox/streets-v11?access_token=YOUR_TOKEN_HERE"

# Should return JSON, not {"message":"Not Authorized - Invalid Token"}
```

**Fix:** Get a fresh token from https://account.mapbox.com/access-tokens/

### 3. WebSocket Connection Issues
**Symptoms:** Console errors about WebSocket connections
**Solutions:**
```bash
# Restart the dev server
npm run dev

# Check if port 5000 is accessible
curl http://localhost:5000/api/health || echo "Server not responding"
```

### 4. Module Resolution Errors
**Symptoms:** Cannot resolve '@/' imports
**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Restart VS Code if using TypeScript extension
```

### 5. Database Connection Issues
**Symptoms:** Database-related errors on startup
**Solutions:**
- Check if you have a `DATABASE_URL` in your `.env.local`
- The app should work without a database for basic testing
- Contact Replit support if you need the database connection string

## Key Differences from Replit

1. **Single Server**: Unlike separate dev servers, everything runs on port 5000
2. **Environment Variables**: Use `.env.local` instead of Replit Secrets
3. **Hot Reload**: Vite HMR works through Express middleware
4. **Database**: You'll need to set up your own PostgreSQL or use a cloud provider
5. **WebSocket**: Works on the same port as HTTP server

## Production Build

```bash
# Build for production
npm run build

# Start production server
npm start

# Serves on PORT environment variable or 5000
```

## Development Tips

1. **VS Code Extensions**: Install ES7+ React/Redux snippets, TypeScript, Tailwind CSS
2. **Console Debugging**: Keep browser console open to monitor WebSocket connections
3. **Network Tab**: Check API calls to `/api/*` endpoints
4. **Map Debugging**: Open `debug-mapbox.html` in browser for standalone map testing

## Success Checklist

- [ ] `npm install` completed without errors
- [ ] `.env.local` created with valid Mapbox token
- [ ] `npm run dev` starts without port conflicts
- [ ] Browser loads app at `http://localhost:5000`
- [ ] Can log in with invite code `ADMIN2025`
- [ ] Map loads (not simulation mode)
- [ ] Console shows WebSocket connections
- [ ] GPS permission prompt appears
- [ ] Racing interface is responsive

If you complete this checklist, your local development environment is ready! 🏁