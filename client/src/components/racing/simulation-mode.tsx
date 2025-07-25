import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, Zap, Clock, Route } from 'lucide-react';

interface SimulationModeProps {
  map: any;
  isActive: boolean;
  onToggle: () => void;
  className?: string;
}

export function SimulationMode({ 
  map,
  isActive, 
  onToggle,
  className = "" 
}: SimulationModeProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);

  return (
    <div className={`${className}`}>
      <Card className="bg-black/80 backdrop-blur-sm border-racing-purple/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-racing-purple text-sm flex items-center">
            <Zap className="h-4 w-4 mr-2" />
            Route Simulation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-xs">Speed:</span>
            <Badge variant="outline" className="border-racing-purple/50 text-racing-purple">
              {simulationSpeed}x
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setIsRunning(!isRunning)}
              className={`flex-1 ${isRunning 
                ? 'bg-racing-amber hover:bg-racing-amber/80' 
                : 'bg-racing-green hover:bg-racing-green/80'
              } text-white`}
            >
              {isRunning ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
              {isRunning ? 'Pause' : 'Start'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsRunning(false);
                // Reset simulation
              }}
              className="border-racing-red/50 text-racing-red hover:bg-racing-red/10"
            >
              <Square className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}