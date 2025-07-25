import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface RouteFeature {
  type: 'Feature';
  properties: {
    name: string;
    description: string;
    distance_km: number;
    distance_miles: number;
    roads: string[];
    type: 'ai_generated' | 'ai_loop' | 'user_generated';
    difficulty?: string;
    loop?: boolean;
  };
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

export interface RouteCollection {
  type: 'FeatureCollection';
  features: RouteFeature[];
}

// Load cached routes from file
export async function loadCachedRoutes(): Promise<RouteCollection | null> {
  try {
    const filePath = path.join(process.cwd(), 'client/public/nj_race_routes.geojson');
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load cached routes:', error);
    return null;
  }
}

// Generate new routes using Python script
export async function generateNJRoutes(place: string, numRoutes: number): Promise<RouteCollection> {
  try {
    // First try to load cached routes
    const cached = await loadCachedRoutes();
    if (cached && cached.features.length > 0) {
      return cached;
    }
    
    // If no cached routes, return the hardcoded ones for now
    // In production, you would run the Python script here
    return {
      type: 'FeatureCollection',
      features: []
    };
  } catch (error) {
    console.error('Failed to generate routes:', error);
    throw error;
  }
}

// Save user-generated route
export async function saveUserRoute(route: RouteFeature): Promise<void> {
  try {
    const filePath = path.join(process.cwd(), 'client/public/user_race_routes.geojson');
    
    // Load existing routes
    let routes: RouteCollection = { type: 'FeatureCollection', features: [] };
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      routes = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet, use empty collection
    }
    
    // Add new route
    routes.features.push({
      ...route,
      properties: {
        ...route.properties,
        type: 'user_generated'
      }
    });
    
    // Save back to file
    await fs.writeFile(filePath, JSON.stringify(routes, null, 2));
  } catch (error) {
    console.error('Failed to save user route:', error);
    throw error;
  }
}