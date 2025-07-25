import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Volume2, VolumeX, Settings } from 'lucide-react';

interface VoiceInstruction {
  distanceAlongGeometry: number;
  announcement: string;
  ssmlAnnouncement?: string;
}

interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: {
    type: string;
    modifier?: string;
    bearing_after?: number;
  };
  name: string;
  voiceInstructions?: VoiceInstruction[];
}

interface VoiceNavigationProps {
  isEnabled: boolean;
  currentStep?: NavigationStep;
  remainingDistance: number;
  currentSpeed?: number;
  onToggle: (enabled: boolean) => void;
  language?: string;
  className?: string;
}

export function VoiceNavigation({
  isEnabled,
  currentStep,
  remainingDistance,
  currentSpeed = 0,
  onToggle,
  language = 'en-US',
  className = ""
}: VoiceNavigationProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastInstruction, setLastInstruction] = useState<string>('');
  const [voiceSettings, setVoiceSettings] = useState({
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8
  });

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const lastAnnouncementRef = useRef<string>('');
  const lastDistanceRef = useRef<number>(0);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setIsSupported(true);
    }
  }, []);

  // Voice instruction logic
  useEffect(() => {
    if (!isEnabled || !isSupported || !synthRef.current || !currentStep) {
      return;
    }

    const triggerVoiceInstruction = () => {
      // Check if we have voice instructions from Mapbox
      if (currentStep.voiceInstructions && currentStep.voiceInstructions.length > 0) {
        const appropriateInstruction = currentStep.voiceInstructions.find(
          instruction => remainingDistance >= instruction.distanceAlongGeometry
        );

        if (appropriateInstruction && appropriateInstruction.announcement !== lastAnnouncementRef.current) {
          speak(appropriateInstruction.announcement);
          lastAnnouncementRef.current = appropriateInstruction.announcement;
          setLastInstruction(appropriateInstruction.announcement);
          return;
        }
      }

      // Fallback to generating voice instructions from step data
      const instruction = generateVoiceInstruction(currentStep, remainingDistance);
      
      // Only speak if instruction changed or we're at key distances
      const shouldSpeak = (
        instruction !== lastAnnouncementRef.current &&
        (
          remainingDistance <= 200 || // Within 200m
          remainingDistance <= 500 && remainingDistance > lastDistanceRef.current || // Approaching
          Math.abs(remainingDistance - lastDistanceRef.current) > 100 // Distance changed significantly
        )
      );

      if (shouldSpeak) {
        speak(instruction);
        lastAnnouncementRef.current = instruction;
        setLastInstruction(instruction);
      }

      lastDistanceRef.current = remainingDistance;
    };

    triggerVoiceInstruction();
  }, [isEnabled, isSupported, currentStep, remainingDistance]);

  const generateVoiceInstruction = (step: NavigationStep, distance: number): string => {
    const distanceText = formatDistanceForVoice(distance);
    const maneuver = step.maneuver;
    const roadName = step.name || 'the road';

    // Generate instruction based on maneuver type
    let baseInstruction = '';
    
    switch (maneuver.type) {
      case 'turn':
        const direction = maneuver.modifier === 'left' ? 'left' : 'right';
        baseInstruction = `Turn ${direction}`;
        break;
      case 'fork':
        const forkDirection = maneuver.modifier === 'left' ? 'left' : 'right';
        baseInstruction = `Take the ${forkDirection} fork`;
        break;
      case 'merge':
        baseInstruction = 'Merge';
        break;
      case 'ramp':
        baseInstruction = 'Take the ramp';
        break;
      case 'roundabout':
        baseInstruction = 'Enter the roundabout';
        break;
      case 'exit roundabout':
        baseInstruction = 'Exit the roundabout';
        break;
      case 'continue':
      case 'straight':
        baseInstruction = 'Continue straight';
        break;
      default:
        baseInstruction = 'Continue';
    }

    // Add distance and road name context
    if (distance > 50) {
      return `In ${distanceText}, ${baseInstruction.toLowerCase()} onto ${roadName}`;
    } else {
      return `${baseInstruction} onto ${roadName}`;
    }
  };

  const formatDistanceForVoice = (meters: number): string => {
    if (meters >= 1000) {
      const km = Math.round(meters / 1000 * 10) / 10;
      return `${km} kilometer${km !== 1 ? 's' : ''}`;
    } else if (meters >= 100) {
      const hundreds = Math.round(meters / 100) * 100;
      return `${hundreds} meters`;
    } else {
      return `${Math.round(meters / 10) * 10} meters`;
    }
  };

  const speak = (text: string) => {
    if (!synthRef.current) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = voiceSettings.rate;
    utterance.pitch = voiceSettings.pitch;
    utterance.volume = voiceSettings.volume;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    synthRef.current.speak(utterance);
  };

  const testVoice = () => {
    if (isEnabled) {
      speak("Voice navigation is working. You will hear turn-by-turn directions during navigation.");
    }
  };

  if (!isSupported) {
    return (
      <Card className={`bg-yellow-900/20 border-yellow-500/30 ${className}`}>
        <CardContent className="p-3">
          <div className="flex items-center space-x-2 text-yellow-400">
            <VolumeX className="h-4 w-4" />
            <span className="text-sm">Voice navigation not supported in this browser</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Voice Toggle */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => onToggle(!isEnabled)}
          variant={isEnabled ? "default" : "outline"}
          size="sm"
          className={`flex items-center space-x-2 ${
            isEnabled 
              ? 'bg-racing-blue hover:bg-racing-blue/80' 
              : 'border-racing-blue/30 text-white hover:bg-racing-blue/20'
          }`}
        >
          {isEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          <span>Voice {isEnabled ? 'On' : 'Off'}</span>
          {isSpeaking && (
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          )}
        </Button>

        <Button
          onClick={testVoice}
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white"
          disabled={!isEnabled}
        >
          Test
        </Button>
      </div>

      {/* Last Instruction Display */}
      {isEnabled && lastInstruction && (
        <Card className="bg-racing-dark/50 border-racing-blue/20">
          <CardContent className="p-3">
            <div className="flex items-start space-x-2">
              <Volume2 className="h-4 w-4 text-racing-blue mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-300 leading-relaxed">
                {lastInstruction}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice Settings (expandable) */}
      <details className="group">
        <summary className="flex items-center cursor-pointer text-sm text-gray-400 hover:text-white">
          <Settings className="h-3 w-3 mr-1" />
          Voice Settings
        </summary>
        <Card className="mt-2 bg-racing-dark/30 border-racing-blue/20">
          <CardContent className="p-3 space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Speed</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={voiceSettings.rate}
                onChange={(e) => setVoiceSettings(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-xs text-gray-500">{voiceSettings.rate}x</span>
            </div>
            
            <div>
              <label className="text-xs text-gray-400 block mb-1">Volume</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={voiceSettings.volume}
                onChange={(e) => setVoiceSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-xs text-gray-500">{Math.round(voiceSettings.volume * 100)}%</span>
            </div>
          </CardContent>
        </Card>
      </details>
    </div>
  );
}