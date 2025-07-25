import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Navigation2, MapPin, Clock, Route as RouteIcon } from 'lucide-react';
import { useNavigation } from '@/hooks/use-navigation';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';

interface NavigationPanelProps {
  origin: [number, number] | null;
  destination: [number, number] | null;
  onClose: () => void;
  onNavigationStart?: () => void;
  onNavigationStop?: () => void;
  className?: string;
}

export function NavigationPanel({
  origin,
  destination,
  onClose,
  onNavigationStart,
  onNavigationStop,
  className = ""
}: NavigationPanelProps) {
  const [showFullPanel, setShowFullPanel] = useState(true);
  
  const {
    isNavigating,
    currentStep,
    currentStepIndex,
    currentRoute,
    distanceRemaining,
    timeRemaining,
    eta,
    routeOptions,
    startNavigation,
    stopNavigation,
    setRouteOptions,
    formatDistance,
    formatDuration,
    getTurnIcon
  } = useNavigation({
    accessToken: import.meta.env.VITE_MAPBOX_TOKEN || '',
    profile: 'driving-traffic'
  });

  const handleStartNavigation = async () => {
    if (origin && destination) {
      const success = await startNavigation(origin, destination);
      if (success) {
        onNavigationStart?.();
      }
    }
  };

  const handleStopNavigation = () => {
    stopNavigation();
    onNavigationStop?.();
    onClose();
  };

  if (!destination) return null;

  // Compact view when navigating
  if (isNavigating && !showFullPanel) {
    return (
      <div className={`${className}`}>
        <Card className="bg-black/90 backdrop-blur-sm border-racing-green/30 shadow-[0_0_30px_rgba(0,255,136,0.3)]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-3xl text-racing-green">
                  {currentStep ? getTurnIcon(currentStep.maneuver.type) : '→'}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">
                    {currentStep?.instruction || 'Calculating route...'}
                  </div>
                  <div className="text-xs text-racing-gray">
                    {currentStep && formatDistance(currentStep.distance)} • {formatDuration(timeRemaining)}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowFullPanel(true)}
                  className="h-8 w-8 text-white/70 hover:text-white"
                >
                  <Navigation2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleStopNavigation}
                  className="h-8 w-8 text-racing-red/70 hover:text-racing-red"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Full panel view
  return (
    <div className={`${className}`}>
      <Card className="bg-black/90 backdrop-blur-sm border-racing-blue/30 shadow-[0_0_40px_rgba(0,136,255,0.3)]">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <Navigation2 className="h-5 w-5 mr-2 text-racing-blue" />
              {isNavigating ? 'NAVIGATING' : 'ROUTE PLANNING'}
            </h3>
            <Button
              size="icon"
              variant="ghost"
              onClick={isNavigating ? () => setShowFullPanel(false) : onClose}
              className="h-8 w-8 text-white/70 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Route Info */}
          {currentRoute && (
            <div className="mb-4 p-3 bg-racing-steel/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <RouteIcon className="h-4 w-4 text-racing-blue" />
                  <span className="text-sm text-white">Total Distance</span>
                </div>
                <span className="text-sm font-medium text-racing-blue">
                  {formatDistance(currentRoute.distance)}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-racing-green" />
                  <span className="text-sm text-white">Duration</span>
                </div>
                <span className="text-sm font-medium text-racing-green">
                  {formatDuration(currentRoute.duration)}
                </span>
              </div>
              {eta && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-racing-yellow" />
                    <span className="text-sm text-white">ETA</span>
                  </div>
                  <span className="text-sm font-medium text-racing-yellow">
                    {eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Current Step (when navigating) */}
          {isNavigating && currentStep && (
            <div className="mb-4 p-4 bg-racing-green/10 border border-racing-green/30 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="text-3xl text-racing-green mt-1">
                  {getTurnIcon(currentStep.maneuver.type)}
                </div>
                <div className="flex-1">
                  <div className="text-base font-medium text-white mb-1">
                    {currentStep.instruction}
                  </div>
                  <div className="text-sm text-racing-gray">
                    {formatDistance(currentStep.distance)} • {formatDuration(currentStep.duration)}
                  </div>
                </div>
              </div>
              
              {/* Next steps preview */}
              {currentRoute && currentStepIndex < currentRoute.steps.length - 1 && (
                <div className="mt-3 pt-3 border-t border-racing-green/20">
                  <div className="text-xs text-racing-gray mb-1">THEN</div>
                  <div className="flex items-center space-x-2 text-sm text-white/70">
                    <span>{getTurnIcon(currentRoute.steps[currentStepIndex + 1].maneuver.type)}</span>
                    <span className="truncate">{currentRoute.steps[currentStepIndex + 1].instruction}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Route Options */}
          <div className="mb-4 space-y-2">
            <div className="text-xs text-racing-gray uppercase tracking-wider mb-2">ROUTE OPTIONS</div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white">Avoid Highways</span>
              <Switch
                checked={routeOptions.avoidHighways}
                onCheckedChange={(checked) => setRouteOptions(prev => ({ ...prev, avoidHighways: checked }))}
                className="scale-90"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white">Avoid Tolls</span>
              <Switch
                checked={routeOptions.avoidTolls}
                onCheckedChange={(checked) => setRouteOptions(prev => ({ ...prev, avoidTolls: checked }))}
                className="scale-90"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white">Fastest Route</span>
              <Switch
                checked={routeOptions.preferFastest}
                onCheckedChange={(checked) => setRouteOptions(prev => ({ ...prev, preferFastest: checked }))}
                className="scale-90"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {!isNavigating ? (
              <>
                <Button
                  onClick={handleStartNavigation}
                  disabled={!origin || !destination}
                  className="flex-1 bg-racing-green hover:bg-racing-green/80 text-black font-bold"
                >
                  <Navigation2 className="h-4 w-4 mr-2" />
                  START NAVIGATION
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="border-racing-red/50 text-racing-red hover:bg-racing-red/10"
                >
                  CANCEL
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setShowFullPanel(false)}
                  className="flex-1 bg-racing-blue hover:bg-racing-blue/80 text-white"
                >
                  MINIMIZE
                </Button>
                <Button
                  onClick={handleStopNavigation}
                  className="flex-1 bg-racing-red hover:bg-racing-red/80 text-white"
                >
                  <X className="h-4 w-4 mr-2" />
                  END NAVIGATION
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}