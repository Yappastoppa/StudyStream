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
  
  return (
    <Card className={`bg-racing-dark/90 backdrop-blur-md border-racing-steel/30 ${className} transition-all duration-200`}>
      <CardContent className="p-4 min-w-[140px]">
        <div className="text-center">
          <div className={`text-3xl font-bold tracking-wider transition-colors duration-300 ${speedColor}`}>
            {speedInMph.toFixed(1)}
          </div>
          <div className="text-xs text-racing-gray uppercase tracking-widest">
            MPH
          </div>
          
          {/* Speed indicator bar */}
          <div className="w-full bg-racing-steel/30 rounded-full h-1 mt-2">
            <div 
              className={`h-1 rounded-full transition-all duration-300 ${speedColor.replace('text-', 'bg-')}`}
              style={{ width: `${Math.min((speedInMph / 120) * 100, 100)}%` }}
            />
          </div>
          
          <div className="border-t border-racing-steel/30 mt-3 pt-2">
            <div className="text-sm font-medium text-white">
              {distanceTraveled.toFixed(1)}
            </div>
            <div className="text-xs text-racing-gray">
              MILES
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
