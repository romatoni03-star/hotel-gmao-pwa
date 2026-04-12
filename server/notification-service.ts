import { createNotification } from "./db";

/**
 * Send notification to admin when critical incident is created
 */
export async function notifyAdminOnCriticalIncident(
  adminUserId: number,
  hotelId: number,
  incidentData: {
    incidentId: string;
    area: string;
    description: string;
    priority: string;
  }
) {
  const title = `🚨 Incidencia Crítica: ${incidentData.area}`;
  const content = `${incidentData.description} (${incidentData.incidentId})`;

  await createNotification({
    userId: adminUserId,
    hotelId,
    type: "critical_incident",
    title,
    content,
    read: false,
  });
}

/**
 * Send notification when work order is assigned to technician
 */
export async function notifyTechnicianOnAssignment(
  technicianUserId: number,
  hotelId: number,
  workOrderData: {
    workOrderId: string;
    area: string;
    type: string;
  }
) {
  const title = `📋 Nueva orden de trabajo: ${workOrderData.area}`;
  const content = `${workOrderData.type === "preventive" ? "Preventiva" : "Correctiva"} (${workOrderData.workOrderId})`;

  await createNotification({
    userId: technicianUserId,
    hotelId,
    type: "work_order_assigned",
    title,
    content,
    read: false,
  });
}

/**
 * Send notification when incident status changes
 */
export async function notifyOnIncidentStatusChange(
  userId: number,
  hotelId: number,
  incidentData: {
    incidentId: string;
    status: string;
  }
) {
  const statusLabel = {
    open: "Abierta",
    "in-progress": "En progreso",
    closed: "Cerrada",
  }[incidentData.status] || incidentData.status;

  const title = `📌 Incidencia actualizada: ${statusLabel}`;
  const content = `${incidentData.incidentId} - Estado: ${statusLabel}`;

  await createNotification({
    userId,
    hotelId,
    type: "system_alert",
    title,
    content,
    read: false,
  });
}

/**
 * Send notification when work order is completed
 */
export async function notifyOnWorkOrderCompletion(
  userId: number,
  hotelId: number,
  workOrderData: {
    workOrderId: string;
    area: string;
  }
) {
  const title = `✅ Orden completada: ${workOrderData.area}`;
  const content = `${workOrderData.workOrderId} ha sido cerrada`;

  await createNotification({
    userId,
    hotelId,
    type: "system_alert",
    title,
    content,
    read: false,
  });
}
