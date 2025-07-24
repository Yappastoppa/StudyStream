import { useEffect, useRef, useState, useCallback } from 'react';
import type { User } from '@shared/schema';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface UseWebSocketProps {
  onUserLocationUpdate?: (data: any) => void;
  onNewAlert?: (data: any) => void;
  onEventInvitation?: (data: any) => void;
  onUserConnected?: (data: any) => void;
  onUserDisconnected?: (data: any) => void;
}

export function useWebSocket({
  onUserLocationUpdate,
  onNewAlert,
  onEventInvitation,
  onUserConnected,
  onUserDisconnected
}: UseWebSocketProps = {}) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        
        switch (data.type) {
          case 'auth_success':
            setUser(data.user);
            break;
          case 'auth_error':
            console.error('Auth error:', data.message);
            break;
          case 'user_location_update':
            onUserLocationUpdate?.(data);
            break;
          case 'new_alert':
            onNewAlert?.(data);
            break;
          case 'event_invitation':
            onEventInvitation?.(data);
            break;
          case 'user_connected':
            onUserConnected?.(data);
            break;
          case 'user_disconnected':
            onUserDisconnected?.(data);
            break;
          case 'nearby_users':
            // Handle nearby users response
            break;
          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setUser(null);
      
      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [onUserLocationUpdate, onNewAlert, onEventInvitation, onUserConnected, onUserDisconnected]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    setIsConnected(false);
    setUser(null);
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  const authenticate = useCallback((inviteCode: string) => {
    sendMessage({ type: 'auth', inviteCode });
  }, [sendMessage]);

  const updateLocation = useCallback((lat: number, lng: number, speed?: number) => {
    sendMessage({ 
      type: 'location_update', 
      lat, 
      lng, 
      speed: speed || 0 
    });
  }, [sendMessage]);

  const toggleGhostMode = useCallback((isGhostMode: boolean) => {
    sendMessage({ type: 'ghost_mode_toggle', isGhostMode });
  }, [sendMessage]);

  const getNearbyUsers = useCallback((lat: number, lng: number, radius: number = 5) => {
    sendMessage({ 
      type: 'get_nearby_users', 
      lat, 
      lng, 
      radius 
    });
  }, [sendMessage]);

  const createEvent = useCallback((eventData: {
    eventType: string;
    startTime: Date;
    lat: number;
    lng: number;
    targetUserId?: number;
  }) => {
    sendMessage({ 
      type: 'create_event',
      ...eventData,
      startTime: eventData.startTime.toISOString()
    });
  }, [sendMessage]);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    user,
    connect,
    disconnect,
    sendMessage,
    authenticate,
    updateLocation,
    toggleGhostMode,
    getNearbyUsers,
    createEvent
  };
}
