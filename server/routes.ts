import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertEventSchema, insertAlertSchema, insertInviteCodeSchema } from "@shared/schema";
import { z } from "zod";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  username?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store connected clients
  const connectedClients = new Map<number, AuthenticatedWebSocket>();

  // Broadcast to all connected clients except sender
  function broadcast(data: any, excludeUserId?: number) {
    const message = JSON.stringify(data);
    connectedClients.forEach((client, userId) => {
      if (client.readyState === WebSocket.OPEN && userId !== excludeUserId) {
        client.send(message);
      }
    });
  }

  // Broadcast to nearby users only
  function broadcastToNearby(data: any, lat: number, lng: number, radius: number, excludeUserId?: number) {
    const message = JSON.stringify(data);
    connectedClients.forEach(async (client, userId) => {
      if (client.readyState === WebSocket.OPEN && userId !== excludeUserId) {
        const user = await storage.getUser(userId);
        if (user && user.currentLat && user.currentLng) {
          const distance = calculateDistance(lat, lng, user.currentLat, user.currentLng);
          if (distance <= radius) {
            client.send(message);
          }
        }
      }
    });
  }

  function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  wss.on('connection', (ws: AuthenticatedWebSocket) => {
    console.log('WebSocket client connected');

    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);

        switch (data.type) {
          case 'auth':
            const user = await storage.getUserByInviteCode(data.inviteCode);
            if (user) {
              ws.userId = user.id;
              ws.username = user.username;
              connectedClients.set(user.id, ws);
              ws.send(JSON.stringify({ type: 'auth_success', user }));
            } else {
              ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid invite code' }));
            }
            break;

          case 'location_update':
            if (ws.userId) {
              const updatedUser = await storage.updateUserLocation(
                ws.userId, 
                data.lat, 
                data.lng, 
                data.speed || 0
              );
              if (updatedUser) {
                broadcast({
                  type: 'user_location_update',
                  userId: ws.userId,
                  username: ws.username,
                  lat: updatedUser.currentLat,
                  lng: updatedUser.currentLng,
                  speed: updatedUser.currentSpeed,
                  isGhostMode: updatedUser.isGhostMode
                }, ws.userId);
              }
            }
            break;

          case 'ghost_mode_toggle':
            if (ws.userId) {
              const updatedUser = await storage.updateUser(ws.userId, { 
                isGhostMode: data.isGhostMode 
              });
              if (updatedUser) {
                broadcast({
                  type: 'user_ghost_mode_update',
                  userId: ws.userId,
                  isGhostMode: updatedUser.isGhostMode
                }, ws.userId);
              }
            }
            break;

          case 'get_nearby_users':
            if (ws.userId && data.lat && data.lng) {
              const nearbyUsers = await storage.getNearbyUsers(
                data.lat, 
                data.lng, 
                data.radius || 5, 
                ws.userId
              );
              ws.send(JSON.stringify({ 
                type: 'nearby_users', 
                users: nearbyUsers.filter(u => !u.isGhostMode)
              }));
            }
            break;

          case 'create_event':
            if (ws.userId) {
              const event = await storage.createEvent({
                type: data.eventType,
                createdBy: ws.userId,
                targetUser: data.targetUserId || null,
                startTime: new Date(data.startTime),
                startLat: data.lat,
                startLng: data.lng
              });

              // Notify nearby users or specific target
              if (data.targetUserId) {
                const targetClient = connectedClients.get(data.targetUserId);
                if (targetClient && targetClient.readyState === WebSocket.OPEN) {
                  targetClient.send(JSON.stringify({
                    type: 'event_invitation',
                    event,
                    inviterUsername: ws.username
                  }));
                }
              } else {
                broadcastToNearby({
                  type: 'new_event',
                  event,
                  creatorUsername: ws.username
                }, data.lat, data.lng, 2, ws.userId);
              }
            }
            break;

          default:
            console.log('Unknown WebSocket message type:', data.type);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        connectedClients.delete(ws.userId);
        broadcast({
          type: 'user_disconnected',
          userId: ws.userId,
          username: ws.username
        }, ws.userId);
      }
    });
  });

  // REST API Routes

  // Generate invite code
  app.post('/api/invite-codes', async (req, res) => {
    try {
      const schema = z.object({
        expiresInHours: z.number().min(1).max(48).default(48)
      });

      const { expiresInHours } = schema.parse(req.body);
      const code = Math.random().toString(36).substring(2, 15).toUpperCase();
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

      const inviteCode = await storage.createInviteCode({
        code,
        expiresAt,
        createdBy: null, // Anonymous for now
        isUsed: false
      });

      res.json(inviteCode);
    } catch (error) {
      res.status(400).json({ message: 'Failed to create invite code' });
    }
  });

  // Register with invite code
  app.post('/api/auth/register', async (req, res) => {
    try {
      const schema = z.object({
        inviteCode: z.string().min(1),
        username: z.string().min(3).max(20).optional()
      });

      const { inviteCode, username } = schema.parse(req.body);

      // Check if invite code is valid (allow admin code to be reused)
      const invite = await storage.getInviteCode(inviteCode);
      if (!invite || invite.expiresAt < new Date()) {
        return res.status(400).json({ message: 'Invalid or expired invite code' });
      }

      // Only check if used for non-admin codes
      if (inviteCode !== "ADMIN2025" && invite.isUsed) {
        return res.status(400).json({ message: 'Invite code already used' });
      }

      // Generate anonymous username if not provided
      const finalUsername = username || `Phantom_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Check if username is already taken
      const existingUser = await storage.getUserByUsername(finalUsername);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }

      // Use the invite code (skip for admin code)
      if (inviteCode !== "ADMIN2025") {
        const codeUsed = await storage.useInviteCode(inviteCode);
        if (!codeUsed) {
          return res.status(400).json({ message: 'Failed to use invite code' });
        }
      }

      // Create user
      const user = await storage.createUser({
        username: finalUsername,
        inviteCode: inviteCode
      });

      res.json({ user, message: 'Registration successful' });
    } catch (error) {
      res.status(400).json({ message: 'Registration failed' });
    }
  });

  // Login with invite code
  app.post('/api/auth/login', async (req, res) => {
    try {
      const schema = z.object({
        inviteCode: z.string().min(1)
      });

      const { inviteCode } = schema.parse(req.body);

      const user = await storage.getUserByInviteCode(inviteCode);
      if (!user) {
        return res.status(401).json({ message: 'Invalid invite code' });
      }

      res.json({ user, message: 'Login successful' });
    } catch (error) {
      res.status(400).json({ message: 'Login failed' });
    }
  });

  // Create alert
  app.post('/api/alerts', async (req, res) => {
    try {
      const data = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(data);

      // Broadcast to nearby users
      broadcastToNearby({
        type: 'new_alert',
        alert
      }, alert.lat, alert.lng, 10); // 10km radius for alerts

      res.json(alert);
    } catch (error) {
      res.status(400).json({ message: 'Failed to create alert' });
    }
  });

  // Get nearby alerts
  app.get('/api/alerts/nearby', async (req, res) => {
    try {
      const schema = z.object({
        lat: z.string().transform(Number),
        lng: z.string().transform(Number),
        radius: z.string().transform(Number).default('5')
      });

      const { lat, lng, radius } = schema.parse(req.query);
      const alerts = await storage.getNearbyAlerts(lat, lng, radius);

      res.json(alerts);
    } catch (error) {
      res.status(400).json({ message: 'Failed to get nearby alerts' });
    }
  });

  // Get active events
  app.get('/api/events', async (req, res) => {
    try {
      const events = await storage.getActiveEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get events' });
    }
  });

  // User management endpoints
  app.get('/api/users/:id', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get user' });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;

      const updatedUser = await storage.updateUser(userId, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ message: 'Failed to update user' });
    }
  });

  // Event management endpoints
  app.get('/api/events/user/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const events = await storage.getUserEvents(userId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get user events' });
    }
  });

  app.put('/api/events/:id', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const updates = req.body;

      const updatedEvent = await storage.updateEvent(eventId, updates);
      if (!updatedEvent) {
        return res.status(404).json({ message: 'Event not found' });
      }

      res.json(updatedEvent);
    } catch (error) {
      res.status(400).json({ message: 'Failed to update event' });
    }
  });

  app.delete('/api/events/:id', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const success = await storage.updateEvent(eventId, { isActive: false });

      if (!success) {
        return res.status(404).json({ message: 'Event not found' });
      }

      res.json({ message: 'Event cancelled successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to cancel event' });
    }
  });

  // Alert management endpoints
  app.get('/api/alerts/user/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const alerts = await storage.getUserAlerts(userId);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get user alerts' });
    }
  });

  app.delete('/api/alerts/:id', async (req, res) => {
    try {
      const alertId = parseInt(req.params.id);
      const success = await storage.deleteAlert(alertId);

      if (!success) {
        return res.status(404).json({ message: 'Alert not found' });
      }

      res.json({ message: 'Alert deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete alert' });
    }
  });

  // Statistics endpoints
  app.get('/api/stats/user/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get user statistics' });
    }
  });

  app.get('/api/leaderboard', async (req, res) => {
    try {
      const schema = z.object({
        type: z.enum(['speed', 'events', 'alerts']).default('speed'),
        limit: z.string().transform(Number).default('10')
      });

      const { type, limit } = schema.parse(req.query);
      const leaderboard = await storage.getLeaderboard(type, limit);

      res.json(leaderboard);
    } catch (error) {
      res.status(400).json({ message: 'Failed to get leaderboard' });
    }
  });

  // Cleanup expired invite codes periodically
  setInterval(async () => {
    await storage.cleanupExpiredCodes();
  }, 60 * 60 * 1000); // Every hour

  return httpServer;
}