import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { generateChecklistPDF, generateWorkOrderPDF } from '../pdf-export';
import { getDb } from '../db';
import { eq } from 'drizzle-orm';
import { checklists, workOrders } from '../../drizzle/schema';

export const exportRouter = router({
  checklist: protectedProcedure
    .input(z.object({ checklistId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const checklist = await db
        .select()
        .from(checklists)
        .where(eq(checklists.id, input.checklistId))
        .limit(1);

      if (!checklist.length || checklist[0].userId !== ctx.user.id) {
        throw new Error('Checklist not found or unauthorized');
      }

      const data = checklist[0];
      const pdfBuffer = await generateChecklistPDF(
        {
          date: data.date,
          completionRate: data.completionRate,
          data: data.data as any,
        },
        ctx.user.name || 'Técnico'
      );

      return {
        filename: `checklist-${data.date}-${ctx.user.id}.pdf`,
        buffer: pdfBuffer.toString('base64'),
      };
    }),

  workOrder: protectedProcedure
    .input(z.object({ workOrderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const workOrder = await db
        .select()
        .from(workOrders)
        .where(eq(workOrders.id, input.workOrderId))
        .limit(1);

      if (!workOrder.length) {
        throw new Error('Work order not found');
      }

      const data = workOrder[0];
      // Check authorization: creator or assigned technician or admin
      if (data.createdByUserId !== ctx.user.id && data.assignedTechnicianId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      const pdfBuffer = await generateWorkOrderPDF(
        {
          workOrderId: data.workOrderId,
          area: data.area,
          type: data.type,
          status: data.status,
          date: data.date,
          timeSpentMinutes: data.timeSpentMinutes || undefined,
          costEstimate: data.costEstimate?.toString(),
          costActual: data.costActual?.toString(),
          notes: data.notes || undefined,
          signatureUrl: data.signatureUrl || undefined,
        },
        ctx.user.name || 'Técnico'
      );

      return {
        filename: `work-order-${data.workOrderId}.pdf`,
        buffer: pdfBuffer.toString('base64'),
      };
    }),
});
