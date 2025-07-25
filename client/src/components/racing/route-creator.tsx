import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pencil, Save, X, MapPin, Route, Trash2 } from 'lucide-react';

interface RouteCreatorProps {
  isActive: boolean;
  onToggle: () => void;
  onRouteCreated?: (route: any) => void;
  className?: string;
}

export function RouteCreator({ 
  isActive, 
  onToggle, 
  onRouteCreated,
  className = "" 
}: RouteCreatorProps) {
  const [routeName, setRouteName] = useState("");
  const [currentRoute, setCurrentRoute] = useState<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  return (
    <div className={`${className}`}>
      <Card className="bg-black/80 backdrop-blur-sm border-racing-green/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-racing-green text-sm flex items-center">
            <Pencil className="h-4 w-4 mr-2" />
            Route Creator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Route name..."
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            className="bg-racing-steel/30 border-racing-green/30 text-white placeholder:text-white/50"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setIsDrawing(!isDrawing)}
              className={`flex-1 ${isDrawing 
                ? 'bg-racing-red hover:bg-racing-red/80' 
                : 'bg-racing-green hover:bg-racing-green/80'
              } text-white`}
            >
              {isDrawing ? <X className="h-3 w-3 mr-1" /> : <Route className="h-3 w-3 mr-1" />}
              {isDrawing ? 'Cancel' : 'Draw'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!currentRoute || !routeName}
              className="border-racing-blue/50 text-racing-blue hover:bg-racing-blue/10"
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}