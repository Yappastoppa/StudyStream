import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Navigation, Search, MapPin, Home } from 'lucide-react';

interface QuickStartNavigationProps {
  onStartPlanning: () => void;
  onQuickDestination: (destination: string) => void;
  isVisible: boolean;
  className?: string;
}

export function QuickStartNavigation({
  onStartPlanning,
  onQuickDestination,
  isVisible,
  className = ""
}: QuickStartNavigationProps) {
  if (!isVisible) return null;

  const quickDestinations = [
    { label: 'Home', icon: Home, value: 'home' },
    { label: 'Work', icon: MapPin, value: 'work' },
    { label: 'Gas Station', icon: MapPin, value: 'gas' },
    { label: 'Restaurant', icon: MapPin, value: 'restaurant' }
  ];

  return (
    <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30 pointer-events-auto ${className}`}>
      <Card className="bg-black/90 backdrop-blur-md border-racing-blue/50 shadow-2xl">
        <CardContent className="p-4">
          <div className="text-center mb-4">
            <h3 className="text-white font-bold text-lg mb-2">Start Navigation</h3>
            <Button
              onClick={onStartPlanning}
              className="bg-racing-blue hover:bg-racing-blue/80 text-white px-6 py-3 rounded-full font-medium shadow-lg"
            >
              <Search className="h-5 w-5 mr-2" />
              Search Destination
            </Button>
          </div>
          
          <div className="border-t border-white/20 pt-4">
            <p className="text-white/70 text-sm mb-3 text-center">Quick Destinations</p>
            <div className="grid grid-cols-2 gap-2">
              {quickDestinations.map((dest, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  onClick={() => onQuickDestination(dest.value)}
                  className="bg-racing-steel/20 hover:bg-racing-steel/30 border border-racing-steel/30 text-white/80 hover:text-white flex items-center justify-center py-2"
                >
                  <dest.icon className="h-4 w-4 mr-2" />
                  <span className="text-sm">{dest.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}