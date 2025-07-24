import { Card, CardContent } from "@/components/ui/card";

interface SpeedHudProps {
  currentSpeed: number;
  distanceTraveled: number;
  className?: string;
}

export function SpeedHud({ currentSpeed, distanceTraveled, className = "" }: SpeedHudProps) {
  return (
    <Card className={`bg-racing-dark/90 backdrop-blur-md border-racing-steel/30 ${className}`}>
      <CardContent className="p-4 min-w-[120px]">
        <div className="text-center">
          <div className="text-2xl font-bold text-racing-blue tracking-wider">
            {Math.round(currentSpeed)}
          </div>
          <div className="text-xs text-racing-gray uppercase tracking-widest">
            MPH
          </div>
          <div className="border-t border-racing-steel/30 mt-2 pt-2">
            <div className="text-sm font-medium">
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
