import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowUpRight, ArrowRight, ArrowDownRight, ArrowDown, ArrowDownLeft, ArrowLeft, ArrowUpLeft } from 'lucide-react';

interface Lane {
  active: boolean;
  valid: boolean;
  indications: string[];
  valid_indication?: string;
}

interface BannerInstruction {
  text: string;
  type: 'primary' | 'secondary' | 'sub';
  modifier?: string;
  degrees?: number;
  driving_side?: 'left' | 'right';
  components?: Array<{
    text: string;
    type: string;
    abbreviation?: string;
    abbreviation_priority?: number;
  }>;
}

interface LaneGuidance {
  lanes: Lane[];
  banner_instructions?: {
    primary?: BannerInstruction;
    secondary?: BannerInstruction;
    sub?: BannerInstruction & {
      lanes?: Lane[];
    };
  };
}

interface LaneGuidanceProps {
  laneData?: LaneGuidance;
  isVisible: boolean;
  upcomingManeuver?: {
    type: string;
    modifier?: string;
    bearing_after?: number;
  };
  distanceToManeuver: number;
  className?: string;
}

export function LaneGuidanceDisplay({
  laneData,
  isVisible,
  upcomingManeuver,
  distanceToManeuver,
  className = ""
}: LaneGuidanceProps) {
  if (!isVisible || !laneData?.lanes?.length) return null;

  // Use sub banner lanes if available (takes precedence), otherwise use main lanes
  const lanes = laneData.banner_instructions?.sub?.lanes || laneData.lanes;
  const bannerInstructions = laneData.banner_instructions;

  const getLaneIcon = (indications: string[], isActive: boolean, isValid: boolean) => {
    const iconClass = `h-6 w-6 ${
      isActive && isValid 
        ? 'text-racing-blue' 
        : isValid 
          ? 'text-gray-300' 
          : 'text-gray-600'
    }`;

    // Get the primary indication for the lane
    const primaryIndication = indications[0] || 'straight';

    switch (primaryIndication) {
      case 'straight':
      case 'none':
        return <ArrowUp className={iconClass} />;
      case 'slight right':
        return <ArrowUpRight className={iconClass} />;
      case 'right':
        return <ArrowRight className={iconClass} />;
      case 'sharp right':
        return <ArrowDownRight className={iconClass} />;
      case 'uturn':
        return <ArrowDown className={iconClass} />;
      case 'sharp left':
        return <ArrowDownLeft className={iconClass} />;
      case 'left':
        return <ArrowLeft className={iconClass} />;
      case 'slight left':
        return <ArrowUpLeft className={iconClass} />;
      default:
        return <ArrowUp className={iconClass} />;
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  // Only show lane guidance when close to maneuver (within 1km)
  if (distanceToManeuver > 1000) return null;

  return (
    <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-40 ${className}`}>
      <Card className="bg-racing-dark/95 border-racing-blue/30 backdrop-blur-md shadow-2xl">
        <CardContent className="p-4">
          {/* Banner Instructions */}
          {bannerInstructions?.primary && (
            <div className="mb-3 text-center">
              <p className="text-white font-semibold text-lg">
                {bannerInstructions.primary.text}
              </p>
              {bannerInstructions.secondary && (
                <p className="text-gray-300 text-sm mt-1">
                  {bannerInstructions.secondary.text}
                </p>
              )}
            </div>
          )}

          {/* Distance to Maneuver */}
          <div className="text-center mb-4">
            <span className="text-racing-blue font-bold text-xl">
              {formatDistance(distanceToManeuver)}
            </span>
            <span className="text-gray-400 ml-2 text-sm">ahead</span>
          </div>

          {/* Lane Display */}
          <div className="flex items-center justify-center space-x-2">
            {lanes.map((lane, index) => (
              <div
                key={index}
                className={`relative flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                  lane.active && lane.valid
                    ? 'border-racing-blue bg-racing-blue/20 shadow-lg shadow-racing-blue/25' 
                    : lane.valid
                      ? 'border-gray-400 bg-gray-400/10'
                      : 'border-gray-600 bg-gray-600/10'
                } ${
                  lane.active ? 'scale-110' : 'scale-100'
                }`}
              >
                {/* Lane Arrow */}
                <div className="mb-2">
                  {getLaneIcon(lane.indications, lane.active, lane.valid)}
                </div>

                {/* Lane Indicator */}
                <div 
                  className={`w-8 h-1 rounded-full ${
                    lane.active && lane.valid
                      ? 'bg-racing-blue' 
                      : lane.valid 
                        ? 'bg-gray-300' 
                        : 'bg-gray-600'
                  }`} 
                />

                {/* Multiple Indications Display */}
                {lane.indications.length > 1 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-xs text-black font-bold">+</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sub Banner (Additional Info) */}
          {bannerInstructions?.sub && !bannerInstructions.sub.lanes && (
            <div className="mt-3 text-center">
              <p className="text-gray-400 text-sm">
                {bannerInstructions.sub.text}
              </p>
            </div>
          )}

          {/* Helper Text */}
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500">
              Stay in highlighted lane{lanes.filter(l => l.active).length > 1 ? 's' : ''}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to create lane guidance from Mapbox step data
export function extractLaneGuidance(step: any): LaneGuidance | null {
  // Check for banner instructions with lane data
  if (step.bannerInstructions?.length > 0) {
    const bannerInstruction = step.bannerInstructions[0];
    
    // Look for lane data in sub banner
    if (bannerInstruction.sub?.components?.some((c: any) => c.type === 'lane')) {
      const laneComponent = bannerInstruction.sub.components.find((c: any) => c.type === 'lane');
      
      if (laneComponent.lanes) {
        return {
          lanes: laneComponent.lanes,
          banner_instructions: {
            primary: bannerInstruction.primary,
            secondary: bannerInstruction.secondary,
            sub: {
              ...bannerInstruction.sub,
              lanes: laneComponent.lanes
            }
          }
        };
      }
    }
  }

  // Fallback: Check for lanes directly in step intersections
  if (step.intersections?.length > 0) {
    const intersection = step.intersections[0];
    if (intersection.lanes?.length > 0) {
      return {
        lanes: intersection.lanes.map((lane: any) => ({
          active: lane.active || false,
          valid: lane.valid !== false,
          indications: lane.indications || ['straight'],
          valid_indication: lane.valid_indication
        }))
      };
    }
  }

  return null;
}

// Mock lane guidance for testing
export function createMockLaneGuidance(maneuverType: string, modifier?: string): LaneGuidance {
  const lanes: Lane[] = [];
  
  // Generate realistic lane configuration based on maneuver
  switch (maneuverType) {
    case 'turn':
      if (modifier === 'left') {
        lanes.push(
          { active: true, valid: true, indications: ['left'] },
          { active: false, valid: false, indications: ['straight'] },
          { active: false, valid: false, indications: ['straight'] },
          { active: false, valid: false, indications: ['right'] }
        );
      } else {
        lanes.push(
          { active: false, valid: false, indications: ['left'] },
          { active: false, valid: false, indications: ['straight'] },
          { active: false, valid: false, indications: ['straight'] },
          { active: true, valid: true, indications: ['right'] }
        );
      }
      break;
      
    case 'merge':
      lanes.push(
        { active: false, valid: false, indications: ['left'] },
        { active: true, valid: true, indications: ['slight right'] },
        { active: true, valid: true, indications: ['straight'] }
      );
      break;
      
    case 'fork':
      if (modifier === 'left') {
        lanes.push(
          { active: true, valid: true, indications: ['slight left'] },
          { active: false, valid: true, indications: ['slight right'] }
        );
      } else {
        lanes.push(
          { active: false, valid: true, indications: ['slight left'] },
          { active: true, valid: true, indications: ['slight right'] }
        );
      }
      break;
      
    default:
      // Default straight configuration
      lanes.push(
        { active: false, valid: true, indications: ['left'] },
        { active: true, valid: true, indications: ['straight'] },
        { active: true, valid: true, indications: ['straight'] },
        { active: false, valid: true, indications: ['right'] }
      );
  }

  return {
    lanes,
    banner_instructions: {
      primary: {
        text: `${maneuverType === 'turn' ? 'Turn' : 'Continue'} ${modifier || 'straight'}`,
        type: 'primary'
      }
    }
  };
}