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
      <div className={`absolute inset-0 rounded-2xl blur-2xl ${speedColor.replace('text-', 'bg-')} opacity-20`} />
      
      {/* Main container */}
      <div className={`relative bg-black/80 backdrop-blur-sm rounded-2xl p-4 min-w-[120px] shadow-2xl ${glowColor}`}>
        <div className="text-center">
          {/* Speed display with glow */}
          <div className="relative">
            <div className={`text-4xl font-bold tracking-tight ${speedColor} drop-shadow-[0_0_20px_currentColor]`}>
              {Math.round(speedInMph)}
            </div>
            <div className="text-[10px] text-white/60 uppercase tracking-wider mt-1">
              MPH
            </div>
          </div>
          
          {/* Compact distance display */}
          <div className="mt-3 pt-2 border-t border-white/10">
            <div className="flex items-baseline justify-center space-x-1">
              <span className="text-lg font-medium text-white/90">{distanceTraveled.toFixed(1)}</span>
              <span className="text-[10px] text-white/50 uppercase">mi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
