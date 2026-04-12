import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with hotel GMAO roles: admin (jefe), technician (técnico), director (dirección).
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "technician", "director"]).default("technician").notNull(),
  hotelId: int("hotelId").notNull().default(1), // Multi-hotel support
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Daily checklist records with JSON storage for flexible item structure.
 * Stores completion state, notes, and timestamps per day.
 */
export const checklists = mysqlTable("checklists", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  hotelId: int("hotelId").notNull().default(1),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  completionRate: int("completionRate").default(0).notNull(),
  data: json("data").$type<Record<string, { checked: boolean; status: "ok" | "issue"; note: string; timestamp: string | null }>>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Checklist = typeof checklists.$inferSelect;
export type InsertChecklist = typeof checklists.$inferInsert;

/**
 * Incidents (incidencias) with priority, area, and status tracking.
 * Supports photo evidence and state transitions.
 */
export const incidents = mysqlTable("incidents", {
  id: int("id").autoincrement().primaryKey(),
  incidentId: varchar("incidentId", { length: 20 }).notNull().unique(), // INC-XXXXXX format
  userId: int("userId").notNull(), // Who reported it
  hotelId: int("hotelId").notNull().default(1),
  area: varchar("area", { length: 32 }).notNull(), // hvac, electrical, plumbing, pool, inspection, safety
  description: text("description").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).notNull(),
  status: mysqlEnum("status", ["open", "in-progress", "closed"]).default("open").notNull(),
  photoUrl: varchar("photoUrl", { length: 512 }), // S3 URL
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  closedByUserId: int("closedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = typeof incidents.$inferInsert;

/**
 * Work orders (órdenes de trabajo) with assignment, cost tracking, and time logging.
 * Supports preventive and corrective maintenance.
 */
export const workOrders = mysqlTable("workOrders", {
  id: int("id").autoincrement().primaryKey(),
  workOrderId: varchar("workOrderId", { length: 20 }).notNull().unique(), // WO-XXXXXX format
  createdByUserId: int("createdByUserId").notNull(), // Who created the order
  assignedTechnicianId: int("assignedTechnicianId"), // Who is assigned (can be null for unassigned)
  hotelId: int("hotelId").notNull().default(1),
  area: varchar("area", { length: 32 }).notNull(), // hvac, electrical, plumbing, pool, inspection, safety
  type: mysqlEnum("type", ["preventive", "corrective"]).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["open", "in-progress", "closed"]).default("open").notNull(),
  costEstimate: decimal("costEstimate", { precision: 10, scale: 2 }),
  costActual: decimal("costActual", { precision: 10, scale: 2 }),
  timeSpentMinutes: int("timeSpentMinutes"), // Total time spent in minutes
  notes: text("notes"),
  signatureUrl: varchar("signatureUrl", { length: 512 }), // S3 URL to signature image
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = typeof workOrders.$inferInsert;

/**
 * Notifications for critical incidents and system alerts.
 * Supports push notifications and in-app notification center.
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  hotelId: int("hotelId").notNull().default(1),
  type: mysqlEnum("type", ["critical_incident", "work_order_assigned", "checklist_reminder", "system_alert"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  relatedIncidentId: int("relatedIncidentId"), // Link to incident if applicable
  relatedWorkOrderId: int("relatedWorkOrderId"), // Link to work order if applicable
  read: boolean("read").default(false).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
