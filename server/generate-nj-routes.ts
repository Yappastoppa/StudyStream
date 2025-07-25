import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

export interface RaceRoute {
  type: 'Feature';
  properties: {
    name: string;
    description: string;
    distance_km: number;
    distance_miles: number;
    roads?: string[];
    type: 'ai_generated' | 'ai_loop' | 'user_generated';
    difficulty?: string;
    loop?: boolean;
    center?: [number, number];
  };
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

export interface RouteCollection {
  type: 'FeatureCollection';
  features: RaceRoute[];
}

/**
 * Generate AI race routes for New Jersey using Python OSMnx
 */
export async function generateNJRoutes(
  place: string = "Jersey City, New Jersey, USA",
  numRoutes: number = 5
): Promise<RouteCollection> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(process.cwd(), 'client/public/nj_race_routes.geojson');
    
    // Spawn Python process to generate routes
    const pythonProcess = spawn('python3', [
      path.join(process.cwd(), 'server/route-generator.py'),
      '--place', place,
      '--output', outputPath,
      '--routes', numRoutes.toString()
    ]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('[Route Generator]', data.toString());
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('[Route Generator Error]', data.toString());
    });
    
    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`Route generation failed with code ${code}: ${stderr}`));
        return;
      }
      
      try {
        // Read the generated GeoJSON file
        const routeData = await fs.readFile(outputPath, 'utf-8');
        const routes = JSON.parse(routeData) as RouteCollection;
        resolve(routes);
      } catch (error) {
        reject(new Error(`Failed to read generated routes: ${error}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to spawn Python process: ${error}`));
    });
  });
}

/**
 * Load pre-generated routes from file
 */
export async function loadCachedRoutes(): Promise<RouteCollection | null> {
  try {
    const routePath = path.join(process.cwd(), 'client/public/nj_race_routes.geojson');
    const routeData = await fs.readFile(routePath, 'utf-8');
    return JSON.parse(routeData) as RouteCollection;
  } catch (error) {
    console.error('Failed to load cached routes:', error);
    return null;
  }
}

/**
 * Save user-generated route
 */
export async function saveUserRoute(route: RaceRoute): Promise<void> {
  const userRoutesPath = path.join(process.cwd(), 'client/public/user_race_routes.geojson');
  
  let existingRoutes: RouteCollection = {
    type: 'FeatureCollection',
    features: []
  };
  
  // Try to load existing user routes
  try {
    const data = await fs.readFile(userRoutesPath, 'utf-8');
    existingRoutes = JSON.parse(data);
  } catch (error) {
    // File doesn't exist yet, that's OK
  }
  
  // Add new route
  route.properties.type = 'user_generated';
  existingRoutes.features.push(route);
  
  // Save back to file
  await fs.writeFile(userRoutesPath, JSON.stringify(existingRoutes, null, 2));
}