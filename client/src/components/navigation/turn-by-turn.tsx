import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Navigation, 
  ArrowUp, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  Clock,
  MapPin,
  X,
  Volume2,
  VolumeX,
  Play,
  Square
} from 'lucide-react';

interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: {
    type: string;
    modifier?: string;
  };
  name: string;
}

interface TurnByTurnProps {
  isActive: boolean;
  onClose: () => void;
  currentStep?: NavigationStep;
  remainingSteps: NavigationStep[];
  destination: string;
  eta: string;
  remainingDistance: number;
  remainingTime: number;
  voiceEnabled: boolean;
  onVoiceToggle: () => void;
  onRecenter: () => void;
  className?: string;
}

export function TurnByTurnNavigation({ 
  isActive,
  onClose,
  currentStep,
  remainingSteps,
  destination,
  eta,
  remainingDistance,
  remainingTime,
  voiceEnabled,
  onVoiceToggle,
  onRecenter,
  className = "" 
}: TurnByTurnProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Get navigation icon based on maneuver type
  const getManeuverIcon = (maneuver: any) => {
    const iconClass = "h-6 w-6 text-white";
    
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

  // Voice announcement
  const announceInstruction = (instruction: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(instruction);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Announce current step when it changes
  useEffect(() => {
    if (currentStep && voiceEnabled) {
      announceInstruction(currentStep.instruction);
    }
  }, [currentStep, voiceEnabled]);

  if (!isActive) return null;

  return (
    <div className={`fixed top-4 left-4 right-4 z-50 ${className}`}>
      {/* Main Navigation Panel */}
      <Card className="bg-black/95 backdrop-blur-md border-racing-blue/50 shadow-2xl">
        <CardContent className="p-4">
          {/* Header with destination and controls */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Navigation className="h-5 w-5 text-racing-blue" />
              <div>
                <div className="text-white font-semibold text-sm truncate max-w-[200px]">
                  {destination}
                </div>
                <div className="text-white/60 text-xs">
                  ETA: {eta}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={onVoiceToggle}
                className="h-8 w-8 p-0 hover:bg-racing-blue/20"
              >
                {voiceEnabled ? 
                  <Volume2 className="h-4 w-4 text-racing-blue" /> : 
                  <VolumeX className="h-4 w-4 text-white/60" />
                }
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={onRecenter}
                className="h-8 w-8 p-0 hover:bg-racing-blue/20"
              >
                <MapPin className="h-4 w-4 text-white" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 p-0 hover:bg-racing-red/20"
              >
                {isMinimized ? <Play className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-racing-red/20"
              >
                <X className="h-4 w-4 text-racing-red" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Current Step */}
              {currentStep && (
                <div className="flex items-center space-x-4 mb-4 p-3 bg-racing-steel/20 rounded-lg border border-racing-blue/30">
                  <div className="flex-shrink-0 w-12 h-12 bg-racing-blue/20 rounded-full flex items-center justify-center border border-racing-blue/50">
                    {getManeuverIcon(currentStep.maneuver)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-base mb-1">
                      {currentStep.instruction}
                    </div>
                    <div className="text-racing-blue font-bold text-lg">
                      {formatDistance(currentStep.distance)}
                    </div>
                    {currentStep.name && (
                      <div className="text-white/60 text-sm truncate">
                        on {currentStep.name}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Trip Summary */}
              <div className="flex items-center justify-between py-2 px-3 bg-racing-steel/10 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-white font-bold text-sm">
                      {formatDistance(remainingDistance)}
                    </div>
                    <div className="text-white/50 text-xs">remaining</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-white font-bold text-sm">
                      {formatTime(remainingTime)}
                    </div>
                    <div className="text-white/50 text-xs">time left</div>
                  </div>
                </div>
                
                <Badge 
                  variant="outline" 
                  className="border-racing-green/50 text-racing-green bg-racing-green/10"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {eta}
                </Badge>
              </div>

              {/* Next Steps Preview */}
              {remainingSteps.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="text-white/60 text-xs font-medium mb-2">Next Steps</div>
                  <div className="space-y-2">
                    {remainingSteps.slice(0, 3).map((step, index) => (
                      <div key={index} className="flex items-center space-x-3 text-xs">
                        <div className="w-6 h-6 bg-racing-steel/30 rounded-full flex items-center justify-center">
                          {getManeuverIcon(step.maneuver)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white/80 truncate">{step.instruction}</div>
                          <div className="text-white/50">{formatDistance(step.distance)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}