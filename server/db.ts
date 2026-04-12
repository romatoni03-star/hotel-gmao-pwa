import { eq, and, desc, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, checklists, incidents, workOrders, notifications } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAdminUsersByHotel(hotelId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.hotelId, hotelId), eq(users.role, "admin")));

  return result;
}

// ============ CHECKLIST QUERIES ============

export async function getTodayChecklist(userId: number, hotelId: number, date: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(checklists)
    .where(and(eq(checklists.userId, userId), eq(checklists.hotelId, hotelId), eq(checklists.date, date)))
    .limit(1);

  if (result.length > 0) {
    return result[0];
  }

  // Auto-create checklist with default items if none exists
  const defaultData = buildDefaultChecklistData();
  const completionRate = 0;

  try {
    await db.insert(checklists).values({
      userId,
      hotelId,
      date,
      data: defaultData,
      completionRate,
    });

    const newResult = await db
      .select()
      .from(checklists)
      .where(and(eq(checklists.userId, userId), eq(checklists.hotelId, hotelId), eq(checklists.date, date)))
      .limit(1);

    return newResult.length > 0 ? newResult[0] : undefined;
  } catch (error) {
    console.error("[Checklist] Failed to auto-create checklist:", error);
    return undefined;
  }
}

function buildDefaultChecklistData(): Record<string, any> {
  const sections = [
    {
      items: [
        { id: "hvac-temp", label: "Temperatura impulsión estable" },
        { id: "hvac-filter", label: "Filtros revisados" },
        { id: "hvac-noise", label: "Sin ruido anómalo en equipos" },
      ],
    },
    {
      items: [
        { id: "electrical-panels", label: "Cuadros sin alarmas" },
        { id: "electrical-backup", label: "Grupo/SAI operativo" },
        { id: "electrical-lighting", label: "Zonas comunes iluminadas" },
      ],
    },
    {
      items: [
        { id: "plumbing-pressure", label: "Presión de agua correcta" },
        { id: "plumbing-leaks", label: "Sin fugas visibles" },
        { id: "plumbing-hotwater", label: "ACS disponible" },
      ],
    },
    {
      items: [
        { id: "pool-ph", label: "pH dentro de rango" },
        { id: "pool-filtration", label: "Filtración operativa" },
        { id: "pool-pumps", label: "Bombas sin incidencia" },
      ],
    },
    {
      items: [
        { id: "inspection-guest", label: "Sin impacto visible al huésped" },
        { id: "inspection-backofhouse", label: "Back-of-house ordenado" },
        { id: "inspection-rooms", label: "Habitaciones críticas verificadas" },
      ],
    },
    {
      items: [
        { id: "safety-fire", label: "Central de incendios normal" },
        { id: "safety-extinguishers", label: "Extintores visibles y accesibles" },
        { id: "safety-exits", label: "Salidas despejadas" },
      ],
    },
  ];

  const data: Record<string, any> = {};

  for (const section of sections) {
    for (const item of section.items) {
      data[item.id] = {
        checked: false,
        status: "ok",
        note: "",
        timestamp: null,
      };
    }
  }

  return data;
}

export async function createChecklist(userId: number, hotelId: number, date: string, data: Record<string, any>, completionRate: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(checklists).values({
    userId,
    hotelId,
    date,
    data,
    completionRate,
  });

  return result;
}

export async function updateChecklistItem(checklistId: number, itemId: string, patch: { checked?: boolean; status?: "ok" | "issue"; note?: string; timestamp?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const checklist = await db.select().from(checklists).where(eq(checklists.id, checklistId)).limit(1);
  if (!checklist.length) throw new Error("Checklist not found");

  const data = checklist[0].data as Record<string, any>;
  const entry = data[itemId];
  if (!entry) throw new Error("Item not found");

  const updated = {
    ...entry,
    ...patch,
  };

  data[itemId] = updated;

  // Recalculate completion rate
  const completedCount = Object.values(data).filter((item: any) => item.checked).length;
  const completionRate = Math.round((completedCount / Object.keys(data).length) * 100);

  await db
    .update(checklists)
    .set({ data, completionRate })
    .where(eq(checklists.id, checklistId));
}

export async function getChecklistHistory(hotelId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(checklists)
    .where(eq(checklists.hotelId, hotelId))
    .orderBy(desc(checklists.date))
    .limit(limit);
}

// ============ INCIDENT QUERIES ============

export async function createIncident(data: Omit<typeof incidents.$inferInsert, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(incidents).values(data);
  return result;
}

export async function getIncidents(hotelId: number, userId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(incidents.hotelId, hotelId)];
  if (userId) {
    conditions.push(eq(incidents.userId, userId));
  }

  return await db
    .select()
    .from(incidents)
    .where(and(...conditions))
    .orderBy(desc(incidents.timestamp));
}

export async function updateIncidentStatus(incidentId: number, status: "open" | "in-progress" | "closed", closedByUserId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updates: any = { status };
  if (status === "closed") {
    updates.closedAt = new Date();
    if (closedByUserId) updates.closedByUserId = closedByUserId;
  }

  await db.update(incidents).set(updates).where(eq(incidents.id, incidentId));
}

// ============ WORK ORDER QUERIES ============

export async function createWorkOrder(data: Omit<typeof workOrders.$inferInsert, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(workOrders).values(data);
  return result;
}

export async function getWorkOrders(hotelId: number, userId?: number, assignedOnly = false) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(workOrders.hotelId, hotelId)];

  if (assignedOnly && userId) {
    conditions.push(eq(workOrders.assignedTechnicianId, userId));
  } else if (userId) {
    // Show work orders created by user or assigned to user
    conditions.push(
      or(eq(workOrders.createdByUserId, userId), eq(workOrders.assignedTechnicianId, userId)) as any
    );
  }

  return await db
    .select()
    .from(workOrders)
    .where(and(...conditions))
    .orderBy(desc(workOrders.date));
}

export async function updateWorkOrderStatus(workOrderId: number, status: "open" | "in-progress" | "closed", updates?: { timeSpentMinutes?: number; costActual?: number; notes?: string; signatureUrl?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const data: any = { status };
  if (status === "closed") {
    data.closedAt = new Date();
  }
  if (updates) {
    Object.assign(data, updates);
  }

  await db.update(workOrders).set(data).where(eq(workOrders.id, workOrderId));
}

// ============ NOTIFICATION QUERIES ============

export async function createNotification(data: Omit<typeof notifications.$inferInsert, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(notifications).values(data);
  return result;
}

export async function getNotifications(userId: number, hotelId: number, unreadOnly = false) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(notifications.userId, userId), eq(notifications.hotelId, hotelId)];
  if (unreadOnly) {
    conditions.push(eq(notifications.read, false));
  }

  return await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt));
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(eq(notifications.id, notificationId));
}
