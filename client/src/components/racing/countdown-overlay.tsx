import { useEffect, useState } from "react";

interface CountdownOverlayProps {
  isActive: boolean;
  onComplete: () => void;
  eventType?: string;
  opponentName?: string;
}

export function CountdownOverlay({ 
  isActive, 
  onComplete, 
  eventType = "Sprint Challenge",
  opponentName = "Unknown Racer"
}: CountdownOverlayProps) {
  const [count, setCount] = useState(3);
  const [isGo, setIsGo] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setCount(3);
      setIsGo(false);
      return;
    }

    const interval = setInterval(() => {
      setCount((prevCount) => {
        if (prevCount > 1) {
          return prevCount - 1;
        } else if (prevCount === 1) {
          setIsGo(true);
          setTimeout(() => {
            onComplete();
          }, 1000);
          return 0;
        }
        return prevCount;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center">
      <div className="text-center">
        <div className={`text-8xl font-black mb-4 animate-pulse tracking-wider ${
          isGo ? 'text-racing-green' : 'text-racing-blue'
        }`}>
          {isGo ? 'GO!' : count}
        </div>
        
        <div className="text-xl text-white font-semibold tracking-widest uppercase mb-2">
          {isGo ? 'Race Started!' : 'Get Ready'}
        </div>
        
        <div className="text-sm text-racing-gray">
          {eventType} vs {opponentName}
        </div>
      </div>
    </div>
  );
}
