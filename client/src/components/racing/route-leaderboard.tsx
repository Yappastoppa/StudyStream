import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, Route, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface RouteRecord {
  id: number;
  userId: number;
  username: string;
  routeId: string;
  routeName: string;
  time: number; // seconds
  avgSpeed: number; // mph
  date: Date;
}

interface RouteLeaderboardProps {
  routeId?: string;
  routeName?: string;
  onClose?: () => void;
}

export function RouteLeaderboard({ routeId, routeName, onClose }: RouteLeaderboardProps) {
  const [selectedRoute, setSelectedRoute] = useState(routeId || 'all');
  
  // Mock data for demonstration
  const mockLeaderboard: RouteRecord[] = [
    {
      id: 1,
      userId: 1,
      username: 'Ghost_Rider_420',
      routeId: 'jersey-city-speedway',
      routeName: 'Jersey City Speedway Circuit',
      time: 845, // 14:05
      avgSpeed: 107.2,
      date: new Date('2025-01-20T23:45:00')
    },
    {
      id: 2,
      userId: 2,
      username: 'Night_Hawk_777',
      routeId: 'jersey-city-speedway',
      routeName: 'Jersey City Speedway Circuit',
      time: 863, // 14:23
      avgSpeed: 105.1,
      date: new Date('2025-01-19T02:15:00')
    },
    {
      id: 3,
      userId: 3,
      username: 'Shadow_Racer_X',
      routeId: 'liberty-loop',
      routeName: 'Liberty State Park Loop',
      time: 612, // 10:12
      avgSpeed: 110.5,
      date: new Date('2025-01-18T01:30:00')
    },
    {
      id: 4,
      userId: 4,
      username: 'Turbo_King_999',
      routeId: 'newark-extreme',
      routeName: 'Newark Airport Extreme',
      time: 1534, // 25:34
      avgSpeed: 98.7,
      date: new Date('2025-01-17T03:20:00')
    },
    {
      id: 5,
      userId: 5,
      username: 'Speed_Demon_666',
      routeId: 'jersey-city-speedway',
      routeName: 'Jersey City Speedway Circuit',
      time: 891, // 14:51
      avgSpeed: 101.9,
      date: new Date('2025-01-16T00:45:00')
    }
  ];
  
  // Filter leaderboard by selected route
  const filteredLeaderboard = selectedRoute === 'all' 
    ? mockLeaderboard 
    : mockLeaderboard.filter(record => record.routeId === selectedRoute);
  
  // Get unique routes
  const uniqueRoutes = Array.from(new Set(mockLeaderboard.map(r => r.routeName)));
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="absolute top-20 left-6 z-30 bg-black/90 backdrop-blur-sm rounded-lg p-4 max-w-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-racing-yellow" />
          Route Leaderboard
        </h3>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 text-white/70 hover:text-white"
          >
            ×
          </Button>
        )}
      </div>
      
      {/* Route Filter */}
      <div className="mb-4">
        <select
          value={selectedRoute}
          onChange={(e) => setSelectedRoute(e.target.value)}
          className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm"
        >
          <option value="all" className="bg-racing-dark">All Routes</option>
          <option value="jersey-city-speedway" className="bg-racing-dark">Jersey City Speedway Circuit</option>
          <option value="liberty-loop" className="bg-racing-dark">Liberty State Park Loop</option>
          <option value="newark-extreme" className="bg-racing-dark">Newark Airport Extreme</option>
        </select>
      </div>
      
      {/* Leaderboard Table */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredLeaderboard.map((record, index) => (
          <div
            key={record.id}
            className={`p-3 rounded-lg transition-all ${
              index === 0 
                ? 'bg-racing-yellow/20 border border-racing-yellow/50' 
                : 'bg-white/5 hover:bg-white/10 border border-transparent'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`text-xl font-bold ${
                  index === 0 ? 'text-racing-yellow' :
                  index === 1 ? 'text-gray-300' :
                  index === 2 ? 'text-orange-600' :
                  'text-gray-500'
                }`}>
                  #{index + 1}
                </div>
                <div>
                  <h4 className="text-white font-medium">{record.username}</h4>
                  {selectedRoute === 'all' && (
                    <p className="text-xs text-gray-400">{record.routeName}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(record.time)}
                </div>
                <div className="text-xs text-gray-400">
                  {record.avgSpeed.toFixed(1)} mph avg
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{format(record.date, 'MMM d, h:mm a')}</span>
              {index === 0 && (
                <Badge className="bg-racing-yellow/20 text-racing-yellow border-racing-yellow/30">
                  Route Record
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Stats Summary */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-400">Total Runs</p>
            <p className="text-lg font-bold text-white">{filteredLeaderboard.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Avg Speed</p>
            <p className="text-lg font-bold text-racing-orange">
              {(filteredLeaderboard.reduce((sum, r) => sum + r.avgSpeed, 0) / filteredLeaderboard.length).toFixed(1)} mph
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}