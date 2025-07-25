import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  RotateCcw,
  Navigation,
  Clock,
  MapPin,
  AlertTriangle,
  Camera,
  Car,
  Fuel,
  MessageCircle,
  Plus,
  X
} from 'lucide-react';

interface WazeStyleNavigationProps {
  isActive: boolean;
  currentStep?: {
    instruction: string;
    distance: number;
    maneuver: {
      type: string;
      modifier?: string;
    };
    name: string;
  };
  eta: string;
  remainingDistance: number;
  remainingTime: number;
  currentSpeed?: number;
  speedLimit?: number;
  onStopNavigation?: () => void;
  className?: string;
}

export function WazeStyleNavigation({
  isActive,
  currentStep,
  eta,
  remainingDistance,
  remainingTime,
  currentSpeed = 0,
  speedLimit,
  onStopNavigation,
  className = ""
}: WazeStyleNavigationProps) {
  const [showReportMenu, setShowReportMenu] = useState(false);

  if (!isActive) return null;

  // Get maneuver icon based on type
  const getManeuverIcon = (maneuver: any) => {
    const iconClass = "h-8 w-8 text-white";
    
    switch (maneuver?.type) {
      case 'turn':
        return maneuver.modifier === 'left' ? 
          <ArrowLeft className={iconClass} /> : 
          <ArrowRight className={iconClass} />;
      case 'continue':
      case 'straight':
        return <ArrowUp className={iconClass} />;
      case 'roundabout':
      case 'rotary':
        return <RotateCcw className={iconClass} />;
      default:
        return <ArrowUp className={iconClass} />;
    }
  };

  // Format distance for display
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Format time for display
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const reportOptions = [
    { icon: AlertTriangle, label: 'Police', color: 'text-blue-400' },
    { icon: Car, label: 'Accident', color: 'text-red-400' },
    { icon: AlertTriangle, label: 'Hazard', color: 'text-yellow-400' },
    { icon: Fuel, label: 'Gas', color: 'text-green-400' },
    { icon: Camera, label: 'Camera', color: 'text-purple-400' },
    { icon: MessageCircle, label: 'Chat', color: 'text-blue-300' }
  ];

  return (
    <div className={`fixed inset-0 pointer-events-none z-40 ${className}`}>
      {/* Next Turn Instruction - Top Center */}
      {currentStep && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <Card className="bg-black/90 backdrop-blur-md border-white/20 shadow-2xl">
            <CardContent className="p-4 flex items-center space-x-4">
              {/* Maneuver Icon */}
              <div className="flex-shrink-0 w-16 h-16 bg-racing-blue/20 rounded-2xl flex items-center justify-center border-2 border-racing-blue/50">
                {getManeuverIcon(currentStep.maneuver)}
              </div>
              
              {/* Instruction Details */}
              <div className="flex-1">
                <div className="text-racing-blue font-bold text-2xl mb-1">
                  {formatDistance(currentStep.distance)}
                </div>
                <div className="text-white font-medium text-lg">
                  {currentStep.instruction}
                </div>
                {currentStep.name && (
                  <div className="text-white/70 text-sm">
                    on {currentStep.name}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Speed Widget - Bottom Left */}
      <div className="absolute bottom-20 left-4 pointer-events-auto">
        <Card className="bg-black/80 backdrop-blur-md border-white/20 shadow-lg">
          <CardContent className="p-3 text-center min-w-[80px]">
            <div className="text-white font-bold text-2xl">
              {Math.round(currentSpeed * 3.6)}
            </div>
            <div className="text-white/60 text-xs">km/h</div>
            {speedLimit && (
              <div className="mt-1">
                <Badge 
                  variant="outline" 
                  className="border-racing-red/50 text-racing-red text-xs"
                >
                  {speedLimit}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trip Summary - Bottom Center */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <Card className="bg-black/90 backdrop-blur-md border-white/20 shadow-2xl">
          <CardContent className="p-3 flex items-center space-x-6">
            <div className="text-center">
              <div className="text-racing-green font-bold text-lg">
                {eta}
              </div>
              <div className="text-white/60 text-xs">ETA</div>
            </div>
            
            <div className="w-px h-8 bg-white/20"></div>
            
            <div className="text-center">
              <div className="text-white font-bold text-lg">
                {formatTime(remainingTime)}
              </div>
              <div className="text-white/60 text-xs">time left</div>
            </div>
            
            <div className="w-px h-8 bg-white/20"></div>
            
            <div className="text-center">
              <div className="text-white font-bold text-lg">
                {formatDistance(remainingDistance)}
              </div>
              <div className="text-white/60 text-xs">distance</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Button & Menu - Bottom Right */}
      <div className="absolute bottom-20 right-4 pointer-events-auto">
        {showReportMenu && (
          <div className="mb-4 space-y-2">
            {reportOptions.map((option, index) => (
              <Button
                key={index}
                onClick={() => {
                  console.log(`Report ${option.label}`);
                  setShowReportMenu(false);
                }}
                className="w-12 h-12 rounded-full bg-black/90 hover:bg-black border border-white/20 backdrop-blur-md shadow-lg flex items-center justify-center"
              >
                <option.icon className={`h-5 w-5 ${option.color}`} />
              </Button>
            ))}
          </div>
        )}
        
        <Button
          onClick={() => setShowReportMenu(!showReportMenu)}
          className={`w-14 h-14 rounded-full shadow-2xl border-2 transition-all duration-200 ${
            showReportMenu 
              ? 'bg-racing-red hover:bg-racing-red/80 border-racing-red/50' 
              : 'bg-racing-blue hover:bg-racing-blue/80 border-racing-blue/50'
          }`}
        >
          {showReportMenu ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <Plus className="h-6 w-6 text-white" />
          )}
        </Button>
      </div>

      {/* Stop Navigation Button - Top Right */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <Button
          onClick={onStopNavigation}
          className="bg-racing-red/90 hover:bg-racing-red border border-racing-red/50 backdrop-blur-md shadow-lg px-4 py-2 rounded-full"
        >
          <X className="h-4 w-4 mr-2" />
          <span className="text-white font-medium">End Route</span>
        </Button>
      </div>
    </div>
  );
}