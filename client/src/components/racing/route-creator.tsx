import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RouteCreatorProps {
  onRouteCreate?: (route: any) => void;
}

export function RouteCreator({ onRouteCreate }: RouteCreatorProps) {
  const [startPoint, setStartPoint] = useState<string>('');
  const [endPoint, setEndPoint] = useState<string>('');
  const [routeName, setRouteName] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const handleCreateRoute = async () => {
    if (!startPoint || !endPoint || !routeName) {
      alert('Please fill in all fields');
      return;
    }

    setIsCreating(true);

    try {
      // Simulate route creation
      const newRoute = {
        id: Date.now().toString(),
        name: routeName,
        start: startPoint,
        end: endPoint,
        distance: Math.random() * 10 + 1, // Random distance 1-11 km
        createdAt: new Date().toISOString()
      };

      onRouteCreate?.(newRoute);

      // Reset form
      setStartPoint('');
      setEndPoint('');
      setRouteName('');
    } catch (error) {
      console.error('Failed to create route:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Create New Route</h3>

      <div className="space-y-2">
        <Label htmlFor="route-name">Route Name</Label>
        <Input
          id="route-name"
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
          placeholder="Enter route name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="start-point">Start Point</Label>
        <Input
          id="start-point"
          value={startPoint}
          onChange={(e) => setStartPoint(e.target.value)}
          placeholder="Enter starting location"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="end-point">End Point</Label>
        <Input
          id="end-point"
          value={endPoint}
          onChange={(e) => setEndPoint(e.target.value)}
          placeholder="Enter destination"
        />
      </div>

      <Button 
        onClick={handleCreateRoute}
        disabled={isCreating}
        className="w-full"
      >
        {isCreating ? 'Creating Route...' : 'Create Route'}
      </Button>
    </Card>
  );
}