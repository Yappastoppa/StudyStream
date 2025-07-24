import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  inviteCode: text("invite_code").notNull().unique(),
  isGhostMode: boolean("is_ghost_mode").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  currentLat: real("current_lat"),
  currentLng: real("current_lng"),
  currentSpeed: real("current_speed").default(0),
  distanceTraveled: real("distance_traveled").default(0),
});

export const inviteCodes = pgTable("invite_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdBy: integer("created_by").references(() => users.id),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "sprint", "circuit", "time_trial", "distance"
  createdBy: integer("created_by").notNull().references(() => users.id),
  targetUser: integer("target_user").references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  isActive: boolean("is_active").default(true),
  startLat: real("start_lat"),
  startLng: real("start_lng"),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "camera", "checkpoint", "hazard"
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  description: text("description"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const eventParticipants = pgTable("event_participants", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id),
  userId: integer("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
  finishedAt: timestamp("finished_at"),
  bestTime: real("best_time"),
  maxSpeed: real("max_speed"),
});

// Schemas
export const insertUserSchema = z.object({
  username: z.string().min(3).max(20),
  inviteCode: z.string(),
  currentLat: z.number().optional(),
  currentLng: z.number().optional(),
  currentSpeed: z.number().default(0),
  isGhostMode: z.boolean().default(false),
  maxSpeed: z.number().optional(),
  totalDistance: z.number().default(0),
});

export const selectUserSchema = insertUserSchema.extend({
  id: z.number(),
  createdAt: z.date(),
  lastSeen: z.date().optional(),
});

export const insertInviteCodeSchema = createInsertSchema(inviteCodes).omit({
  id: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
});

export const insertEventParticipantSchema = createInsertSchema(eventParticipants).omit({
  id: true,
  joinedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InviteCode = typeof inviteCodes.$inferSelect;
export type InsertInviteCode = z.infer<typeof insertInviteCodeSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type EventParticipant = typeof eventParticipants.$inferSelect;
export type InsertEventParticipant = z.infer<typeof insertEventParticipantSchema>;