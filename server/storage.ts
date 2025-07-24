import { 
  users, inviteCodes, events, alerts, eventParticipants,
  type User, type InsertUser, type InviteCode, type InsertInviteCode,
  type Event, type InsertEvent, type Alert, type InsertAlert,
  type EventParticipant, type InsertEventParticipant
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByInviteCode(code: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  updateUserLocation(id: number, lat: number, lng: number, speed: number): Promise<User | undefined>;
  getAllActiveUsers(): Promise<User[]>;
  getNearbyUsers(lat: number, lng: number, radiusKm: number, excludeUserId?: number): Promise<User[]>;

  // Invite Codes
  createInviteCode(code: InsertInviteCode): Promise<InviteCode>;
  getInviteCode(code: string): Promise<InviteCode | undefined>;
  useInviteCode(code: string): Promise<boolean>;
  cleanupExpiredCodes(): Promise<void>;

  // Events
  createEvent(event: InsertEvent): Promise<Event>;
  getEvent(id: number): Promise<Event | undefined>;
  getActiveEvents(): Promise<Event[]>;
  getUserEvents(userId: number): Promise<Event[]>;
  updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined>;

  // Alerts
  createAlert(alert: InsertAlert): Promise<Alert>;
  getActiveAlerts(): Promise<Alert[]>;
  getNearbyAlerts(lat: number, lng: number, radiusKm: number): Promise<Alert[]>;
  deactivateAlert(id: number): Promise<boolean>;

  // Event Participants
  joinEvent(participant: InsertEventParticipant): Promise<EventParticipant>;
  getEventParticipants(eventId: number): Promise<EventParticipant[]>;
  updateEventParticipant(eventId: number, userId: number, updates: Partial<InsertEventParticipant>): Promise<EventParticipant | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private inviteCodes: Map<string, InviteCode>;
  private events: Map<number, Event>;
  private alerts: Map<number, Alert>;
  private eventParticipants: Map<string, EventParticipant>;
  private currentUserId: number;
  private currentInviteId: number;
  private currentEventId: number;
  private currentAlertId: number;
  private currentParticipantId: number;

  constructor() {
    this.users = new Map();
    this.inviteCodes = new Map();
    this.events = new Map();
    this.alerts = new Map();
    this.eventParticipants = new Map();
    this.currentUserId = 1;
    this.currentInviteId = 1;
    this.currentEventId = 1;
    this.currentAlertId = 1;
    this.currentParticipantId = 1;
  }

  // Helper function to calculate distance between two points
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByInviteCode(code: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.inviteCode === code);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      lastSeen: new Date(),
      currentLat: null,
      currentLng: null,
      currentSpeed: 0,
      distanceTraveled: 0,
      isGhostMode: false
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates, lastSeen: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserLocation(id: number, lat: number, lng: number, speed: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    // Add fuzzing for privacy (100m precision)
    const fuzzedLat = Math.round(lat * 1000) / 1000; // ~100m precision
    const fuzzedLng = Math.round(lng * 1000) / 1000;

    const updatedUser = { 
      ...user, 
      currentLat: fuzzedLat,
      currentLng: fuzzedLng,
      currentSpeed: speed,
      lastSeen: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllActiveUsers(): Promise<User[]> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return Array.from(this.users.values()).filter(user => 
      user.lastSeen && user.lastSeen > fiveMinutesAgo && !user.isGhostMode
    );
  }

  async getNearbyUsers(lat: number, lng: number, radiusKm: number, excludeUserId?: number): Promise<User[]> {
    const activeUsers = await this.getAllActiveUsers();
    return activeUsers.filter(user => {
      if (user.id === excludeUserId) return false;
      if (!user.currentLat || !user.currentLng) return false;
      
      const distance = this.calculateDistance(lat, lng, user.currentLat, user.currentLng);
      return distance <= radiusKm;
    });
  }

  // Invite Codes
  async createInviteCode(insertCode: InsertInviteCode): Promise<InviteCode> {
    const id = this.currentInviteId++;
    const inviteCode: InviteCode = { 
      ...insertCode, 
      id,
      isUsed: insertCode.isUsed ?? false,
      createdBy: insertCode.createdBy ?? null
    };
    this.inviteCodes.set(insertCode.code, inviteCode);
    return inviteCode;
  }

  async getInviteCode(code: string): Promise<InviteCode | undefined> {
    return this.inviteCodes.get(code);
  }

  async useInviteCode(code: string): Promise<boolean> {
    const inviteCode = this.inviteCodes.get(code);
    if (!inviteCode || inviteCode.isUsed || inviteCode.expiresAt < new Date()) {
      return false;
    }
    
    const updatedCode = { ...inviteCode, isUsed: true };
    this.inviteCodes.set(code, updatedCode);
    return true;
  }

  async cleanupExpiredCodes(): Promise<void> {
    const now = new Date();
    const expiredCodes: string[] = [];
    this.inviteCodes.forEach((inviteCode, code) => {
      if (inviteCode.expiresAt < now) {
        expiredCodes.push(code);
      }
    });
    expiredCodes.forEach(code => this.inviteCodes.delete(code));
  }

  // Events
  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = this.currentEventId++;
    const event: Event = { 
      ...insertEvent, 
      id,
      targetUser: insertEvent.targetUser ?? null,
      isActive: insertEvent.isActive ?? true,
      startLat: insertEvent.startLat ?? null,
      startLng: insertEvent.startLng ?? null
    };
    this.events.set(id, event);
    return event;
  }

  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getActiveEvents(): Promise<Event[]> {
    return Array.from(this.events.values()).filter(event => event.isActive);
  }

  async getUserEvents(userId: number): Promise<Event[]> {
    return Array.from(this.events.values()).filter(event => 
      event.createdBy === userId || event.targetUser === userId
    );
  }

  async updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    
    const updatedEvent = { ...event, ...updates };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  // Additional alert methods
  async getUserAlerts(userId: number): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(alert => alert.userId === userId);
  }

  async deleteAlert(id: number): Promise<boolean> {
    return this.alerts.delete(id);
  }

  // Statistics methods
  async getUserStats(userId: number): Promise<{
    totalEvents: number;
    totalAlerts: number;
    maxSpeed: number;
    totalDistance: number;
  }> {
    const user = this.users.get(userId);
    if (!user) {
      return { totalEvents: 0, totalAlerts: 0, maxSpeed: 0, totalDistance: 0 };
    }

    const userEvents = Array.from(this.events.values()).filter(
      event => event.createdBy === userId
    );
    const userAlerts = Array.from(this.alerts.values()).filter(
      alert => alert.userId === userId
    );

    return {
      totalEvents: userEvents.length,
      totalAlerts: userAlerts.length,
      maxSpeed: user.maxSpeed || 0,
      totalDistance: user.totalDistance || 0
    };
  }

  async getLeaderboard(type: 'speed' | 'events' | 'alerts', limit: number): Promise<Array<{
    userId: number;
    username: string;
    value: number;
  }>> {
    const users = Array.from(this.users.values());
    
    let sortedUsers;
    switch (type) {
      case 'speed':
        sortedUsers = users
          .filter(user => user.maxSpeed)
          .sort((a, b) => (b.maxSpeed || 0) - (a.maxSpeed || 0))
          .map(user => ({
            userId: user.id,
            username: user.username,
            value: user.maxSpeed || 0
          }));
        break;
      case 'events':
        const eventCounts = new Map<number, number>();
        this.events.forEach(event => {
          const count = eventCounts.get(event.createdBy) || 0;
          eventCounts.set(event.createdBy, count + 1);
        });
        sortedUsers = users
          .map(user => ({
            userId: user.id,
            username: user.username,
            value: eventCounts.get(user.id) || 0
          }))
          .filter(entry => entry.value > 0)
          .sort((a, b) => b.value - a.value);
        break;
      case 'alerts':
        const alertCounts = new Map<number, number>();
        this.alerts.forEach(alert => {
          const count = alertCounts.get(alert.userId) || 0;
          alertCounts.set(alert.userId, count + 1);
        });
        sortedUsers = users
          .map(user => ({
            userId: user.id,
            username: user.username,
            value: alertCounts.get(user.id) || 0
          }))
          .filter(entry => entry.value > 0)
          .sort((a, b) => b.value - a.value);
        break;
      default:
        sortedUsers = [];
    }
    
    return sortedUsers.slice(0, limit);
  }

  // Alerts
  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = this.currentAlertId++;
    const alert: Alert = { 
      ...insertAlert, 
      id,
      description: insertAlert.description ?? null,
      createdAt: new Date(),
      isActive: true
    };
    this.alerts.set(id, alert);
    return alert;
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(alert => alert.isActive);
  }

  async getNearbyAlerts(lat: number, lng: number, radiusKm: number): Promise<Alert[]> {
    const activeAlerts = await this.getActiveAlerts();
    return activeAlerts.filter(alert => {
      const distance = this.calculateDistance(lat, lng, alert.lat, alert.lng);
      return distance <= radiusKm;
    });
  }

  async deactivateAlert(id: number): Promise<boolean> {
    const alert = this.alerts.get(id);
    if (!alert) return false;
    
    const updatedAlert = { ...alert, isActive: false };
    this.alerts.set(id, updatedAlert);
    return true;
  }

  // Event Participants
  async joinEvent(insertParticipant: InsertEventParticipant): Promise<EventParticipant> {
    const id = this.currentParticipantId++;
    const participant: EventParticipant = { 
      ...insertParticipant, 
      id,
      joinedAt: new Date(),
      finishedAt: null,
      bestTime: null,
      maxSpeed: null
    };
    const key = `${insertParticipant.eventId}-${insertParticipant.userId}`;
    this.eventParticipants.set(key, participant);
    return participant;
  }

  async getEventParticipants(eventId: number): Promise<EventParticipant[]> {
    return Array.from(this.eventParticipants.values()).filter(p => p.eventId === eventId);
  }

  async updateEventParticipant(eventId: number, userId: number, updates: Partial<InsertEventParticipant>): Promise<EventParticipant | undefined> {
    const key = `${eventId}-${userId}`;
    const participant = this.eventParticipants.get(key);
    if (!participant) return undefined;
    
    const updatedParticipant = { ...participant, ...updates };
    this.eventParticipants.set(key, updatedParticipant);
    return updatedParticipant;
  }
}

export const storage = new MemStorage();
