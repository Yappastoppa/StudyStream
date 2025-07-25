import { Card, CardContent } from "@/components/ui/card";

interface SpeedHudProps {
  currentSpeed: number;
  distanceTraveled: number;
  className?: string;
}

export function SpeedHud({ currentSpeed, distanceTraveled, className = "" }: SpeedHudProps) {
  // Convert km/h to mph (if currentSpeed is in km/h)
  const speedInMph = currentSpeed * 0.621371;
  const speedColor = speedInMph > 80 ? 'text-racing-red' : speedInMph > 50 ? 'text-racing-yellow' : 'text-racing-blue';
  const glowColor = speedInMph > 80 ? 'shadow-racing-red/50' : speedInMph > 50 ? 'shadow-racing-yellow/50' : 'shadow-racing-blue/50';
  
  return (
    <div className={`relative ${className}`}>
      {/* Glow effect */}
      <div className={`absolute inset-0 rounded-full blur-lg ${speedColor.replace('text-', 'bg-')} opacity-20`} />
      
      {/* Compact gauge container */}
      <div className={`relative bg-black/90 backdrop-blur-sm rounded-full p-3 w-16 h-16 shadow-lg ${glowColor} flex items-center justify-center`}>
        <div className="text-center">
          {/* Compact speed display */}
          <div className={`text-lg font-bold tracking-tight ${speedColor} drop-shadow-[0_0_10px_currentColor]`}>
            {Math.round(speedInMph)}
          </div>
          <div className="text-[8px] text-white/60 uppercase tracking-wider -mt-1">
            MPH
          </div>
        </div>
      </div>
      
      {/* Distance as small overlay */}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
        <div className="bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5">
          <div className="flex items-baseline justify-center space-x-0.5">
            <span className="text-xs font-medium text-white/80">{distanceTraveled.toFixed(1)}</span>
            <span className="text-[8px] text-white/50">mi</span>
          </div>
        </div>
      </div>
    </div>
  );
}
