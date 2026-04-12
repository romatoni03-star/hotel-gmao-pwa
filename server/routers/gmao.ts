import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { exportRouter } from "./gmao-export";
import {
  getTodayChecklist,
  createChecklist,
  updateChecklistItem,
  getChecklistHistory,
  createIncident,
  getIncidents,
  updateIncidentStatus,
  createWorkOrder,
  getWorkOrders,
  updateWorkOrderStatus,
  createNotification,
  getNotifications,
  markNotificationAsRead,
  getAdminUsersByHotel,
} from "../db";
import { notifyAdminOnCriticalIncident, notifyTechnicianOnAssignment, notifyOnIncidentStatusChange, notifyOnWorkOrderCompletion } from "../notification-service";
import { nanoid } from "nanoid";

/**
 * Role-based procedure guards
 */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return next({ ctx });
});

const technicianProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "technician" && ctx.user.role !== "admin") {
    throw new Error("Technician access required");
  }
  return next({ ctx });
});

const directorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "director" && ctx.user.role !== "admin") {
    throw new Error("Director access required");
  }
  return next({ ctx });
});

export const gmaoRouter = router({
  // ============ CHECKLIST PROCEDURES ============

  checklist: router({
    getToday: protectedProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ ctx, input }) => {
        const checklist = await getTodayChecklist(ctx.user.id, ctx.user.hotelId, input.date);
        if (!checklist) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No se pudo cargar el checklist",
          });
        }
        return checklist;
      }),

    create: technicianProcedure
      .input(
        z.object({
          date: z.string(),
          data: z.record(z.string(), z.object({
            checked: z.boolean(),
            status: z.enum(["ok", "issue"]),
            note: z.string(),
            timestamp: z.string().nullable(),
          })),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const completionRate = Math.round(
          (Object.values(input.data).filter((item: any) => item.checked).length / Object.keys(input.data).length) * 100
        );
        return await createChecklist(ctx.user.id, ctx.user.hotelId, input.date, input.data, completionRate);
      }),

    updateItem: technicianProcedure
      .input(
        z.object({
          checklistId: z.number(),
          itemId: z.string(),
          patch: z.object({
            checked: z.boolean().optional(),
            status: z.enum(["ok", "issue"]).optional(),
            note: z.string().optional(),
            timestamp: z.string().nullable().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        await updateChecklistItem(input.checklistId, input.itemId, input.patch);
        return { success: true };
      }),

    getHistory: adminProcedure
      .input(z.object({ limit: z.number().default(30) }))
      .query(async ({ ctx, input }) => {
        return await getChecklistHistory(ctx.user.hotelId, input.limit);
      }),
  }),

  // ============ INCIDENT PROCEDURES ============

  incident: router({
    create: technicianProcedure
      .input(
        z.object({
          area: z.string(),
          description: z.string(),
          priority: z.enum(["low", "medium", "high", "critical"]),
          photoUrl: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const incidentId = `INC-${nanoid(6).toUpperCase()}`;
        await createIncident({
          incidentId,
          userId: ctx.user.id,
          hotelId: ctx.user.hotelId,
          area: input.area,
          description: input.description,
          priority: input.priority,
          status: "open",
          photoUrl: input.photoUrl,
        });

        // Notify all admins if critical
        if (input.priority === "critical") {
          const admins = await getAdminUsersByHotel(ctx.user.hotelId);
          for (const admin of admins) {
            await notifyAdminOnCriticalIncident(admin.id, ctx.user.hotelId, {
              incidentId,
              area: input.area,
              description: input.description,
              priority: input.priority,
            });
          }
        }

        return { incidentId };
      }),

    list: protectedProcedure
      .input(z.object({ userId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        // Technicians see only their own incidents, admins see all
        const userId = ctx.user.role === "technician" ? ctx.user.id : input.userId;
        return await getIncidents(ctx.user.hotelId, userId);
      }),

    updateStatus: adminProcedure
      .input(
        z.object({
          incidentId: z.number(),
          status: z.enum(["open", "in-progress", "closed"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateIncidentStatus(input.incidentId, input.status, ctx.user.id);
        
        // Notify incident creator about status change
        const incidents = await getIncidents(ctx.user.hotelId, undefined);
        const incident = incidents.find((i: any) => i.id === input.incidentId);
        if (incident) {
          await notifyOnIncidentStatusChange(incident.userId, ctx.user.hotelId, {
            incidentId: incident.incidentId,
            status: input.status,
          });
        }
        
        return { success: true };
      }),
  }),

  // ============ WORK ORDER PROCEDURES ============

  workOrder: router({
    create: technicianProcedure
      .input(
        z.object({
          area: z.string(),
          type: z.enum(["preventive", "corrective"]),
          description: z.string().optional(),
          assignedTechnicianId: z.number().optional(),
          costEstimate: z.number().optional(),
          date: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const workOrderId = `WO-${nanoid(6).toUpperCase()}`;
        await createWorkOrder({
          workOrderId,
          createdByUserId: ctx.user.id,
          assignedTechnicianId: input.assignedTechnicianId,
          hotelId: ctx.user.hotelId,
          area: input.area,
          type: input.type,
          description: input.description,
          status: "open",
          costEstimate: input.costEstimate ? (input.costEstimate.toString() as any) : undefined,
          date: input.date,
        });

        return { workOrderId };
      }),

    list: protectedProcedure
      .input(z.object({ userId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        // Technicians see only their assignments, admins see all
        const userId = ctx.user.role === "technician" ? ctx.user.id : input.userId;
        return await getWorkOrders(ctx.user.hotelId, userId);
      }),

    updateStatus: technicianProcedure
      .input(
        z.object({
          workOrderId: z.number(),
          status: z.enum(["open", "in-progress", "closed"]),
          timeSpentMinutes: z.number().optional(),
          costActual: z.number().optional(),
          notes: z.string().optional(),
          signatureUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await updateWorkOrderStatus(input.workOrderId, input.status, {
          timeSpentMinutes: input.timeSpentMinutes,
          costActual: input.costActual ? (input.costActual.toString() as any) : undefined,
          notes: input.notes,
          signatureUrl: input.signatureUrl,
        });
        return { success: true };
      }),
  }),

  // ============ NOTIFICATION PROCEDURES ============

  notification: router({
    list: protectedProcedure
      .input(z.object({ unreadOnly: z.boolean().default(false) }))
      .query(async ({ ctx, input }) => {
        return await getNotifications(ctx.user.id, ctx.user.hotelId, input.unreadOnly);
      }),

    markAsRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ input }) => {
        await markNotificationAsRead(input.notificationId);
        return { success: true };
      }),
  }),

  // ============ DASHBOARD PROCEDURES ============

  dashboard: router({
    getMetrics: protectedProcedure.query(async ({ ctx }) => {
      // TODO: Implement role-based KPI aggregation
      // Admin: all metrics
      // Technician: personal metrics
      // Director: summary only

      return {
        checklistCompletion: 0,
        openIncidents: 0,
        criticalIssues: 0,
        closedWorkOrders: 0,
      };
    }),
  }),
  export: exportRouter,
});
