import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Trash2, 
  MapPin, 
  HardDrive, 
  Wifi, 
  WifiOff,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

interface OfflineRoute {
  id: string;
  name: string;
  origin: {
    name: string;
    coordinates: [number, number];
  };
  destination: {
    name: string;
    coordinates: [number, number];
  };
  distance: number;
  duration: number;
  geometry: {
    coordinates: [number, number][];
  };
  steps: any[];
  cachedAt: Date;
  expiresAt: Date;
  tilesCached: boolean;
  dataSize: number; // in MB
}

interface OfflineRoutesProps {
  isVisible: boolean;
  onClose: () => void;
  className?: string;
}

export function OfflineRoutes({
  isVisible,
  onClose,
  className = ""
}: OfflineRoutesProps) {
  const [offlineRoutes, setOfflineRoutes] = useState<OfflineRoute[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [downloadProgress, setDownloadProgress] = useState<{[key: string]: number}>({});
  const [totalCacheSize, setTotalCacheSize] = useState(0);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load cached routes from IndexedDB/localStorage
  useEffect(() => {
    loadOfflineRoutes();
  }, []);

  const loadOfflineRoutes = async () => {
    try {
      // In a real implementation, this would query IndexedDB
      const cachedRoutes = JSON.parse(localStorage.getItem('offlineRoutes') || '[]');
      
      const parsedRoutes = cachedRoutes.map((route: any) => ({
        ...route,
        cachedAt: new Date(route.cachedAt),
        expiresAt: new Date(route.expiresAt)
      }));

      setOfflineRoutes(parsedRoutes);
      
      // Calculate total cache size
      const totalSize = parsedRoutes.reduce((sum: number, route: OfflineRoute) => sum + route.dataSize, 0);
      setTotalCacheSize(totalSize);
    } catch (error) {
      console.error('Failed to load offline routes:', error);
    }
  };

  const cacheRoute = async (route: any) => {
    const routeId = `route_${Date.now()}`;
    setDownloadProgress(prev => ({ ...prev, [routeId]: 0 }));

    try {
      // Simulate caching process with progress
      const steps = [
        { name: 'Downloading route data', progress: 20 },
        { name: 'Caching map tiles', progress: 60 },
        { name: 'Storing navigation data', progress: 80 },
        { name: 'Finalizing cache', progress: 100 }
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setDownloadProgress(prev => ({ ...prev, [routeId]: step.progress }));
      }

      // Create offline route object
      const offlineRoute: OfflineRoute = {
        id: routeId,
        name: `Route to ${route.destination || 'Destination'}`,
        origin: {
          name: route.origin || 'Current Location',
          coordinates: route.startCoords || [0, 0]
        },
        destination: {
          name: route.destination || 'Destination',
          coordinates: route.endCoords || [0, 0]
        },
        distance: route.distance || 0,
        duration: route.duration || 0,
        geometry: route.geometry || { coordinates: [] },
        steps: route.steps || [],
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        tilesCached: true,
        dataSize: Math.random() * 50 + 10 // Simulate size 10-60 MB
      };

      // Save to storage
      const updatedRoutes = [...offlineRoutes, offlineRoute];
      setOfflineRoutes(updatedRoutes);
      localStorage.setItem('offlineRoutes', JSON.stringify(updatedRoutes));

      // Update cache size
      setTotalCacheSize(prev => prev + offlineRoute.dataSize);

      // Clear progress
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[routeId];
        return newProgress;
      });

    } catch (error) {
      console.error('Failed to cache route:', error);
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[routeId];
        return newProgress;
      });
    }
  };

  const deleteOfflineRoute = async (routeId: string) => {
    try {
      const routeToDelete = offlineRoutes.find(r => r.id === routeId);
      const updatedRoutes = offlineRoutes.filter(r => r.id !== routeId);
      
      setOfflineRoutes(updatedRoutes);
      localStorage.setItem('offlineRoutes', JSON.stringify(updatedRoutes));
      
      if (routeToDelete) {
        setTotalCacheSize(prev => prev - routeToDelete.dataSize);
      }

      // In a real implementation, clear IndexedDB cache and map tiles
      await clearRouteCache(routeId);
    } catch (error) {
      console.error('Failed to delete offline route:', error);
    }
  };

  const clearAllCache = async () => {
    try {
      setOfflineRoutes([]);
      setTotalCacheSize(0);
      localStorage.removeItem('offlineRoutes');
      
      // Clear all cached data
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  const clearRouteCache = async (routeId: string) => {
    // Clear specific route cache
    if ('caches' in window) {
      const cache = await caches.open(`route-${routeId}`);
      const keys = await cache.keys();
      await Promise.all(keys.map(key => cache.delete(key)));
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const formatSize = (mb: number): string => {
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatDistance = (meters: number): string => {
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
  };

  const isExpired = (route: OfflineRoute): boolean => {
    return new Date() > route.expiresAt;
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm ${className}`}>
      <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-hidden">
        <Card className="bg-racing-dark/95 border-racing-blue/30 rounded-t-3xl rounded-b-none shadow-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center space-x-2">
                <HardDrive className="h-5 w-5 text-racing-blue" />
                <span>Offline Routes</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  {isOnline ? (
                    <Wifi className="h-4 w-4 text-green-400" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-400" />
                  )}
                  <span className={`text-xs ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </Button>
              </div>
            </div>
            
            {/* Cache Info */}
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>{offlineRoutes.length} cached routes</span>
              <span>{formatSize(totalCacheSize)} used</span>
            </div>
          </CardHeader>

          <CardContent className="p-0 max-h-[50vh] overflow-y-auto">
            {offlineRoutes.length === 0 ? (
              <div className="p-8 text-center">
                <HardDrive className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">No offline routes cached</p>
                <p className="text-sm text-gray-500">
                  Cache routes before going offline for uninterrupted navigation
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {offlineRoutes.map((route) => (
                  <div 
                    key={route.id}
                    className="p-4 border-b border-racing-blue/10 hover:bg-racing-blue/5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-white font-medium truncate">
                            {route.name}
                          </h3>
                          {isExpired(route) ? (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Expired
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-green-900/20 text-green-400">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Cached
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-gray-400">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{route.origin.name}</span>
                            <span>→</span>
                            <span className="truncate">{route.destination.name}</span>
                          </div>

                          <div className="flex items-center space-x-4">
                            <span>{formatDistance(route.distance)}</span>
                            <span>{formatDuration(route.duration)}</span>
                            <span>{formatSize(route.dataSize)}</span>
                          </div>

                          <div className="flex items-center space-x-1 text-xs">
                            <Clock className="h-3 w-3" />
                            <span>Cached: {formatDate(route.cachedAt)}</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={() => deleteOfflineRoute(route.id)}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-400 ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Download Progress */}
                    {downloadProgress[route.id] !== undefined && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">Caching route...</span>
                          <span className="text-xs text-gray-400">{downloadProgress[route.id]}%</span>
                        </div>
                        <Progress 
                          value={downloadProgress[route.id]} 
                          className="h-1 bg-gray-700"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          {/* Actions */}
          {offlineRoutes.length > 0 && (
            <div className="p-4 border-t border-racing-blue/20 bg-racing-dark/50">
              <Button
                onClick={clearAllCache}
                variant="outline"
                size="sm"
                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Cached Routes
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// Utility functions for route caching
export const RouteCache = {
  // Cache a route with tiles for offline use
  async cacheRoute(route: any, bounds: [[number, number], [number, number]]): Promise<string> {
    const routeId = `route_${Date.now()}`;
    
    try {
      // Cache route data
      await this.storeRouteData(routeId, route);
      
      // Cache map tiles for the route area
      await this.cacheMapTiles(routeId, bounds);
      
      return routeId;
    } catch (error) {
      console.error('Failed to cache route:', error);
      throw error;
    }
  },

  // Store route data in IndexedDB
  async storeRouteData(routeId: string, route: any): Promise<void> {
    if (!('indexedDB' in window)) {
      throw new Error('IndexedDB not supported');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('OfflineRoutes', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['routes'], 'readwrite');
        const store = transaction.objectStore('routes');
        
        store.put({
          id: routeId,
          ...route,
          cachedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('routes')) {
          db.createObjectStore('routes', { keyPath: 'id' });
        }
      };
    });
  },

  // Cache map tiles using Service Worker
  async cacheMapTiles(routeId: string, bounds: [[number, number], [number, number]]): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    // Calculate tile URLs for the route bounds
    const tileUrls = this.generateTileUrls(bounds);
    
    // Cache tiles using Cache API
    const cache = await caches.open(`route-tiles-${routeId}`);
    await cache.addAll(tileUrls);
  },

  // Generate tile URLs for a bounding box
  generateTileUrls(bounds: [[number, number], [number, number]]): string[] {
    const urls: string[] = [];
    const zooms = [10, 11, 12, 13, 14, 15]; // Cache multiple zoom levels
    
    // This is a simplified version - real implementation would be more complex
    zooms.forEach(zoom => {
      const tileSize = 256;
      const scale = 1 << zoom;
      
      const minTileX = Math.floor((bounds[0][0] + 180) / 360 * scale);
      const maxTileX = Math.floor((bounds[1][0] + 180) / 360 * scale);
      const minTileY = Math.floor((1 - Math.log(Math.tan(bounds[1][1] * Math.PI / 180) + 1 / Math.cos(bounds[1][1] * Math.PI / 180)) / Math.PI) / 2 * scale);
      const maxTileY = Math.floor((1 - Math.log(Math.tan(bounds[0][1] * Math.PI / 180) + 1 / Math.cos(bounds[0][1] * Math.PI / 180)) / Math.PI) / 2 * scale);
      
      for (let x = minTileX; x <= maxTileX; x++) {
        for (let y = minTileY; y <= maxTileY; y++) {
          urls.push(`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/${zoom}/${x}/${y}?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`);
        }
      }
    });
    
    return urls;
  }
};