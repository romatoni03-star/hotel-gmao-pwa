import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Generate PDF for a completed checklist
 */
export async function generateChecklistPDF(
  checklistData: {
    date: string;
    completionRate: number;
    data: Record<string, { checked: boolean; status: string; note: string; timestamp: string | null }>;
  },
  userName: string
): Promise<Buffer> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(22, 50, 46);
  doc.text('CHECKLIST DIARIO', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${new Date(checklistData.date).toLocaleDateString('es-ES')}`, 20, yPosition);
  yPosition += 7;
  doc.text(`Técnico: ${userName}`, 20, yPosition);
  yPosition += 7;
  doc.text(`Completitud: ${checklistData.completionRate}%`, 20, yPosition);

  yPosition += 15;

  // Items table
  const tableData: any[] = [];
  Object.entries(checklistData.data).forEach(([itemId, entry]) => {
    tableData.push([
      itemId,
      entry.checked ? '✓' : '✗',
      entry.status === 'ok' ? 'OK' : 'ISSUE',
      entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('es-ES') : '—',
      entry.note || '—',
    ]);
  });

  (doc as any).autoTable({
    startY: yPosition,
    head: [['Item', 'Completado', 'Estado', 'Hora', 'Nota']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [36, 75, 70],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 30, 30],
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 35, halign: 'center' },
      4: { cellWidth: 'auto' },
    },
  });

  // Footer
  yPosition = pageHeight - 20;
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 20, yPosition);
  doc.text(`Página 1 de 1`, pageWidth - 30, yPosition);

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Generate PDF for a closed work order
 */
export async function generateWorkOrderPDF(
  workOrderData: {
    workOrderId: string;
    area: string;
    type: string;
    status: string;
    description?: string;
    date: string;
    timeSpentMinutes?: number;
    costEstimate?: string;
    costActual?: string;
    notes?: string;
    signatureUrl?: string;
  },
  technicianName: string
): Promise<Buffer> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  doc.setFontSize(18);
  doc.setTextColor(22, 50, 46);
  doc.text('ORDEN DE TRABAJO', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`ID: ${workOrderData.workOrderId}`, 20, yPosition);
  yPosition += 7;
  doc.text(`Técnico: ${technicianName}`, 20, yPosition);
  yPosition += 7;
  doc.text(`Fecha: ${new Date(workOrderData.date).toLocaleDateString('es-ES')}`, 20, yPosition);

  yPosition += 15;

  // Details section
  doc.setFontSize(10);
  doc.setTextColor(36, 75, 70);
  doc.text('DETALLES', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const details = [
    [`Área: ${workOrderData.area}`],
    [`Tipo: ${workOrderData.type === 'preventive' ? 'Preventiva' : 'Correctiva'}`],
    [`Estado: ${workOrderData.status}`],
    [`Tiempo empleado: ${workOrderData.timeSpentMinutes ? `${workOrderData.timeSpentMinutes} min` : '—'}`],
    [`Coste estimado: ${workOrderData.costEstimate || '—'}`],
    [`Coste real: ${workOrderData.costActual || '—'}`],
  ];

  details.forEach((detail) => {
    doc.text(detail[0], 20, yPosition);
    yPosition += 6;
  });

  // Notes section
  if (workOrderData.notes) {
    yPosition += 5;
    doc.setFontSize(10);
    doc.setTextColor(36, 75, 70);
    doc.text('NOTAS', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const splitNotes = doc.splitTextToSize(workOrderData.notes, pageWidth - 40);
    doc.text(splitNotes, 20, yPosition);
    yPosition += splitNotes.length * 5 + 5;
  }

  // Signature section
  if (workOrderData.signatureUrl) {
    yPosition = pageHeight - 50;
    doc.setFontSize(10);
    doc.setTextColor(36, 75, 70);
    doc.text('FIRMA DEL TÉCNICO', 20, yPosition);
    yPosition += 10;

    try {
      doc.addImage(workOrderData.signatureUrl, 'PNG', 20, yPosition, 60, 20);
    } catch (e) {
      doc.text('[Firma digital no disponible]', 20, yPosition);
    }
  }

  // Footer
  yPosition = pageHeight - 10;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 20, yPosition);

  return Buffer.from(doc.output('arraybuffer'));
}
