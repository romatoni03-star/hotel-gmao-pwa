/*
Design philosophy: Mediterranean tectonic control with multi-user backend integration.
Technicians work with real-time cloud persistence while maintaining offline capability.
*/

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { Camera, CheckCircle2, ClipboardList, Gauge, Plus, ShieldAlert, Wrench, LogOut, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";

const HERO_TEXTURE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663545867004/RXt82Tfo7aKLWucATcMohd/gmao-mineral-interface-texture-Vf5pthasZ7qks7NdpXi4Ji.webp";
const HVAC_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663545867004/RXt82Tfo7aKLWucATcMohd/gmao-hvac-technical-luxury-v2-M3aSWmUN7mCxWQx3UwWAEa.webp";
const POOL_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663545867004/RXt82Tfo7aKLWucATcMohd/gmao-pool-systems-premium-v2-DzdmzHW8knPbYdMHcFkUUX.webp";

type AppView = "dashboard" | "checklists" | "incidents" | "tasks";

const viewConfig: Array<{ id: AppView; label: string; icon: typeof Gauge }> = [
  { id: "dashboard", label: "Panel", icon: Gauge },
  { id: "checklists", label: "Checklist", icon: ClipboardList },
  { id: "incidents", label: "Incidencias", icon: ShieldAlert },
  { id: "tasks", label: "OT", icon: Wrench },
];

const AREA_OPTIONS = [
  { label: "HVAC", value: "hvac" },
  { label: "Electricidad", value: "electrical" },
  { label: "Fontanería", value: "plumbing" },
  { label: "Piscina", value: "pool" },
  { label: "Inspección", value: "inspection" },
  { label: "Seguridad", value: "safety" },
];

const PRIORITY_OPTIONS = [
  { label: "Baja", value: "low" },
  { label: "Media", value: "medium" },
  { label: "Alta", value: "high" },
  { label: "Crítica", value: "critical" },
];

const STATUS_OPTIONS = [
  { label: "Abierto", value: "open" },
  { label: "En progreso", value: "in-progress" },
  { label: "Cerrado", value: "closed" },
];

function SectionShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#56756d]">Operativa</p>
          <h2 className="font-display text-[1.45rem] leading-none text-[#183430]">{title}</h2>
        </div>
        <p className="max-w-[13rem] text-right text-xs leading-relaxed text-[#6a746f]">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "alert" | "stable" }) {
  return (
    <Card className="overflow-hidden rounded-[1.6rem] border-white/55 bg-white/75 shadow-[0_18px_45px_rgba(63,67,58,0.12)] backdrop-blur-sm">
      <CardContent className="relative p-4">
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-1.5",
            tone === "alert" ? "bg-[#9d4332]" : "bg-[#244b46]",
          )}
        />
        <p className="text-[0.7rem] uppercase tracking-[0.18em] text-[#76807a]">{label}</p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <span className="font-display text-[2rem] leading-none text-[#173733]">{value}</span>
          <span className="max-w-[6.5rem] text-right text-xs leading-snug text-[#6c736f]">{hint}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoChip({ text, accent = false }: { text: string; accent?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
        accent
          ? "border-[#204842]/20 bg-[#204842] text-[#f5f1e8]"
          : "border-[#204842]/12 bg-white/70 text-[#4f625d]",
      )}
    >
      {text}
    </span>
  );
}

export default function Home() {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState<AppView>("dashboard");
  const [todayKey] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });

  // tRPC queries
  const todayChecklistQuery = trpc.gmao.checklist.getToday.useQuery({ date: todayKey });
  const incidentsQuery = trpc.gmao.incident.list.useQuery({});
  const workOrdersQuery = trpc.gmao.workOrder.list.useQuery({});
  const notificationsQuery = trpc.gmao.notification.list.useQuery({ unreadOnly: false });

  // tRPC mutations
  const createChecklistMutation = trpc.gmao.checklist.create.useMutation();
  const updateChecklistItemMutation = trpc.gmao.checklist.updateItem.useMutation();
  const createIncidentMutation = trpc.gmao.incident.create.useMutation();
  const updateIncidentStatusMutation = trpc.gmao.incident.updateStatus.useMutation();
  const createWorkOrderMutation = trpc.gmao.workOrder.create.useMutation();
  const updateWorkOrderStatusMutation = trpc.gmao.workOrder.updateStatus.useMutation();
  const exportChecklistMutation = trpc.gmao.export.checklist.useMutation();
  const exportWorkOrderMutation = trpc.gmao.export.workOrder.useMutation();

  // Form states
  const [incidentForm, setIncidentForm] = useState({ area: "hvac", description: "", priority: "high", photoUrl: "" });
  const [taskForm, setTaskForm] = useState({ area: "hvac", type: "preventive", assignedTechnicianId: "", costEstimate: "" });

  // Calculate metrics
  const completionRate = useMemo(() => {
    if (!todayChecklistQuery.data?.data) return 0;
    const items = Object.values(todayChecklistQuery.data.data);
    if (items.length === 0) return 0;
    const checked = items.filter((item: any) => item.checked).length;
    return Math.round((checked / items.length) * 100);
  }, [todayChecklistQuery.data]);

  const openIncidents = useMemo(() => incidentsQuery.data?.filter((i: any) => i.status === "open").length || 0, [incidentsQuery.data]);
  const criticalIssues = useMemo(() => incidentsQuery.data?.filter((i: any) => i.priority === "critical").length || 0, [incidentsQuery.data]);
  const closedWorkOrders = useMemo(() => workOrdersQuery.data?.filter((w: any) => w.status === "closed").length || 0, [workOrdersQuery.data]);

  const renderDashboard = () => (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/45 bg-[#11332f] p-5 text-[#f7f1e8] shadow-[0_24px_60px_rgba(19,41,38,0.26)]">
        <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: `url(${HERO_TEXTURE})` }} />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(17,51,47,0.96),rgba(31,64,59,0.82)_52%,rgba(137,81,55,0.68))]" />
        <div className="relative space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <InfoChip text={user?.role === "admin" ? "Jefe" : user?.role === "technician" ? "Técnico" : "Dirección"} accent />
              <div className="space-y-2">
                <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[#d9d0c0]">Hotel coastal maintenance</p>
                <h1 className="font-display text-[2.05rem] leading-[0.95] sm:text-[2.45rem]">
                  Control diario para mantenimiento hotelero de alta presión.
                </h1>
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-white/15 bg-white/10 px-3 py-2 text-right backdrop-blur-sm">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-[#ded3c5]">Hoy</p>
              <p className="font-display text-lg">{new Date().toLocaleDateString("es-ES", { weekday: "short", month: "short", day: "numeric" })}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Checklist" value={`${completionRate}%`} hint="avance del turno" tone="stable" />
            <MetricCard label="Incidencias abiertas" value={`${openIncidents}`} hint="seguimiento activo" tone="alert" />
            <MetricCard label="Críticas" value={`${criticalIssues}`} hint="impacto huésped" tone="alert" />
            <MetricCard label="OT cerradas" value={`${closedWorkOrders}`} hint="cerradas hoy" tone="stable" />
          </div>
        </div>
      </section>
    </div>
  );

  const renderChecklists = () => (
    <SectionShell title="Checklist diario" subtitle="Un único flujo táctil para validar sistemas críticos.">
      <Card className="rounded-[1.7rem] border-white/55 bg-white/76 shadow-[0_18px_42px_rgba(66,67,58,0.09)]">
        <CardContent className="space-y-5 p-4">
          <div className="flex items-center justify-between gap-4 rounded-[1.35rem] bg-[#f3eee5] px-4 py-3">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[#6d746e]">Estado diario</p>
              <p className="font-display text-xl text-[#173733]">{todayChecklistQuery.data?.completionRate || 0}% completado</p>
            </div>
            <div className="flex items-center gap-2">
              {todayChecklistQuery.data && todayChecklistQuery.data.completionRate > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-[#244b46]/15 bg-white text-[#244b46]"
                  onClick={async () => {
                    try {
                      if (!todayChecklistQuery.data) return;
                      const result = await exportChecklistMutation.mutateAsync({ checklistId: todayChecklistQuery.data.id });
                      const binaryString = atob(result.buffer);
                      const bytes = new Uint8Array(binaryString.length);
                      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                      const blob = new Blob([bytes], { type: "application/pdf" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = result.filename;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                      toast.success("Checklist exportado");
                    } catch (e) {
                      toast.error("Error al exportar");
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              )}
              <Badge className="rounded-full border-[#244b46]/15 bg-white px-3 py-1 text-[#244b46] hover:bg-white">Hoy</Badge>
            </div>
          </div>
          {todayChecklistQuery.isLoading && <p className="text-center text-sm text-gray-500">Cargando checklist...</p>}
          {todayChecklistQuery.error && <p className="text-center text-sm text-red-500">Error al cargar checklist</p>}
          {todayChecklistQuery.data && (
            <div className="space-y-3">
              {Object.entries(todayChecklistQuery.data.data || {}).map(([itemId, entry]: any) => (
                <div key={itemId} className="rounded-[1.2rem] border border-[#ece3d6] bg-white p-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={entry.checked}
                      className="mt-1 data-[state=checked]:border-[#244b46] data-[state=checked]:bg-[#244b46]"
                      onCheckedChange={(checked) => {
                        if (!todayChecklistQuery.data) return;
                        updateChecklistItemMutation.mutate({
                          checklistId: todayChecklistQuery.data.id,
                          itemId,
                          patch: { checked: Boolean(checked), timestamp: checked ? new Date().toISOString() : null },
                        });
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#173733]">{itemId}</p>
                      <p className="text-xs text-[#6f7772]">Hora: {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : "—"}</p>
                      <Textarea
                        value={entry.note}
                        onChange={(e) => {
                          if (!todayChecklistQuery.data) return;
                          updateChecklistItemMutation.mutate({
                            checklistId: todayChecklistQuery.data.id,
                            itemId,
                            patch: { note: e.target.value },
                          });
                        }}
                        className="mt-2 min-h-16 rounded-[1rem] border-[#e6dece] bg-[#fbf8f2] text-sm"
                        placeholder="Observación opcional"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </SectionShell>
  );

  const renderIncidents = () => (
    <SectionShell title="Incidencias" subtitle="Alta rápida con prioridad hotelera.">
      <div className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
        <Card className="rounded-[1.7rem] border-white/55 bg-white/78 shadow-[0_18px_42px_rgba(66,67,58,0.09)]">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[#6d7771]">Nuevo registro</p>
                <h3 className="font-display text-xl text-[#183430]">Parte operativo</h3>
              </div>
              <Button
                className="rounded-full bg-[#244b46] text-[#f5f1e8] hover:bg-[#1a3c37]"
                onClick={async () => {
                  if (!incidentForm.description.trim()) {
                    toast.error("Añade una descripción");
                    return;
                  }
                  await createIncidentMutation.mutateAsync({
                    area: incidentForm.area,
                    description: incidentForm.description,
                    priority: incidentForm.priority as any,
                    photoUrl: incidentForm.photoUrl,
                  });
                  setIncidentForm({ area: "hvac", description: "", priority: "high", photoUrl: "" });
                  toast.success("Incidencia registrada");
                  incidentsQuery.refetch();
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Área</Label>
                <Select value={incidentForm.area} onValueChange={(v) => setIncidentForm({ ...incidentForm, area: v })}>
                  <SelectTrigger className="rounded-[1rem] border-[#e7ded1] bg-[#fbf8f2]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AREA_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={incidentForm.priority} onValueChange={(v) => setIncidentForm({ ...incidentForm, priority: v })}>
                  <SelectTrigger className="rounded-[1rem] border-[#e7ded1] bg-[#fbf8f2]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                  className="min-h-28 rounded-[1rem] border-[#e7ded1] bg-[#fbf8f2]"
                  placeholder="Describe el problema..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.7rem] border-white/55 bg-white/78 shadow-[0_18px_42px_rgba(66,67,58,0.09)]">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-4 px-4 py-4">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[#6d7771]">Seguimiento</p>
                <h3 className="font-display text-xl text-[#183430]">Incidencias activas</h3>
              </div>
              <Badge className="rounded-full border-[#244b46]/12 bg-[#f3eee5] px-3 py-1 text-[#244b46] hover:bg-[#f3eee5]">{openIncidents} abiertas</Badge>
            </div>
            <Separator />
            <ScrollArea className="h-[31rem] px-4 py-4">
              <div className="space-y-3">
                {incidentsQuery.data?.map((incident: any) => (
                  <div key={incident.id} className="rounded-[1.35rem] border border-[#ece2d4] bg-[#fcfaf7] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a756f]">{incident.incidentId}</span>
                          <Badge className="rounded-full border px-2.5 py-1 text-xs">{incident.priority}</Badge>
                          <Badge className="rounded-full border px-2.5 py-1 text-xs">{incident.status}</Badge>
                        </div>
                        <p className="font-medium text-[#183430]">{incident.description}</p>
                      </div>
                      {user?.role === "admin" && (
                        <Button
                          variant="outline"
                          className="rounded-full border-[#244b46]/15 bg-white text-[#244b46]"
                          onClick={() => {
                            const nextStatus = incident.status === "open" ? "in-progress" : "closed";
                            updateIncidentStatusMutation.mutate({ incidentId: incident.id, status: nextStatus });
                          }}
                        >
                          Avanzar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </SectionShell>
  );

  const renderTasks = () => (
    <SectionShell title="GMAO ligera" subtitle="Órdenes preventivas y correctivas.">
      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="overflow-hidden rounded-[1.7rem] border-white/55 bg-white/78 shadow-[0_18px_42px_rgba(66,67,58,0.09)]">
          <img src={POOL_IMAGE} alt="Sala técnica piscina hotel" className="h-48 w-full object-cover" />
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[#6d7771]">Nueva orden</p>
                <h3 className="font-display text-xl text-[#183430]">Preventiva o correctiva</h3>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Área</Label>
                <Select value={taskForm.area} onValueChange={(v) => setTaskForm({ ...taskForm, area: v })}>
                  <SelectTrigger className="rounded-[1rem] border-[#e7ded1] bg-[#fbf8f2]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AREA_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={taskForm.type} onValueChange={(v) => setTaskForm({ ...taskForm, type: v })}>
                  <SelectTrigger className="rounded-[1rem] border-[#e7ded1] bg-[#fbf8f2]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventiva</SelectItem>
                    <SelectItem value="corrective">Correctiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="h-11 w-full rounded-[1rem] bg-[#244b46] text-[#f5f1e8] hover:bg-[#183934]"
                onClick={async () => {
                  await createWorkOrderMutation.mutateAsync({
                    area: taskForm.area,
                    type: taskForm.type as any,
                    date: todayKey,
                    costEstimate: taskForm.costEstimate ? parseFloat(taskForm.costEstimate) : undefined,
                  });
                  setTaskForm({ area: "hvac", type: "preventive", assignedTechnicianId: "", costEstimate: "" });
                  toast.success("Orden creada");
                  workOrdersQuery.refetch();
                }}
              >
                Guardar orden
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.7rem] border-white/55 bg-white/78 shadow-[0_18px_42px_rgba(66,67,58,0.09)]">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[#6d7771]">Órdenes</p>
                <h3 className="font-display text-xl text-[#183430]">Backlog del día</h3>
              </div>
              <Badge className="rounded-full border-[#244b46]/12 bg-[#f3eee5] px-3 py-1 text-[#244b46] hover:bg-[#f3eee5]">{workOrdersQuery.data?.length || 0} total</Badge>
            </div>

            <div className="space-y-3">
              {workOrdersQuery.data?.map((task: any) => (
                <div key={task.id} className="rounded-[1.35rem] border border-[#ece2d4] bg-[#fcfaf7] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a756f]">{task.workOrderId}</span>
                        <Badge className="rounded-full border px-2.5 py-1 text-xs">{task.status}</Badge>
                        <Badge className="rounded-full border px-2.5 py-1 text-xs">{task.type}</Badge>
                      </div>
                      <p className="font-medium text-[#183430]">{task.area}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.status === "closed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full border-[#244b46]/15 bg-white text-[#244b46]"
                          onClick={async () => {
                            try {
                              const result = await exportWorkOrderMutation.mutateAsync({ workOrderId: task.id });
                              const binaryString = atob(result.buffer);
                              const bytes = new Uint8Array(binaryString.length);
                              for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                              const blob = new Blob([bytes], { type: "application/pdf" });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement("a");
                              link.href = url;
                              link.download = result.filename;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(url);
                              toast.success("Orden exportada");
                            } catch (e) {
                              toast.error("Error al exportar");
                            }
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          PDF
                        </Button>
                      )}
                      {user?.role === "technician" && task.status !== "closed" && (
                        <Button
                          variant="outline"
                          className="rounded-full border-[#244b46]/15 bg-white text-[#244b46]"
                          onClick={async () => {
                            try {
                              const nextStatus = task.status === "open" ? "in-progress" : "closed";
                              await updateWorkOrderStatusMutation.mutateAsync({ workOrderId: task.id, status: nextStatus });
                              workOrdersQuery.refetch();
                            } catch {
                              toast.error("Error al actualizar la orden de trabajo");
                            }
                          }}
                        >
                          Cerrar fase
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </SectionShell>
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f1e8_0%,#efe6d9_34%,#f4efe7_100%)] text-[#16322e]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.88),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(32,72,66,0.08),transparent_22%)]" />
      <main className="relative mx-auto flex min-h-screen w-full max-w-[31rem] flex-col px-4 pb-28 pt-4 sm:max-w-5xl sm:px-6 lg:px-8">
        <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-5 grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.8rem] border border-white/55 bg-white/72 p-4 shadow-[0_18px_42px_rgba(66,67,58,0.08)] backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.24em] text-[#6c7872]">Mediterranean operations</p>
                <h1 className="mt-2 font-display text-[1.65rem] leading-none text-[#16322e]">Hotel GMAO</h1>
              </div>
              <div className="rounded-[1.2rem] border border-[#234638]/10 bg-[#f5efe6] px-3 py-2 text-right">
                <p className="text-[0.65rem] uppercase tracking-[0.18em] text-[#6f7873]">Usuario</p>
                <p className="font-semibold text-[#214841]">{user?.name || "Cargando..."}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-white/55 bg-[rgba(36,75,70,0.92)] p-4 text-[#f7f1e8] shadow-[0_18px_42px_rgba(31,50,48,0.16)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.24em] text-[#d9cfbe]">Rol</p>
                <p className="mt-1 font-display text-[1.35rem] leading-none capitalize">{user?.role}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={logout} className="text-[#daccbb] hover:bg-white/10">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </motion.header>

        <div className="flex-1 space-y-6">
          {activeView === "dashboard" && renderDashboard()}
          {activeView === "checklists" && renderChecklists()}
          {activeView === "incidents" && renderIncidents()}
          {activeView === "tasks" && renderTasks()}
        </div>
      </main>

      <nav className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-1.5rem)] max-w-[31rem] -translate-x-1/2 rounded-[1.85rem] border border-white/60 bg-[rgba(252,248,242,0.88)] p-2 shadow-[0_20px_55px_rgba(40,43,36,0.18)] backdrop-blur-xl sm:w-[calc(100%-3rem)] sm:max-w-5xl">
        <div className="grid grid-cols-4 gap-2">
          {viewConfig.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center rounded-[1.2rem] px-2 text-center transition",
                  active ? "bg-[#204842] text-[#f5f1e8] shadow-[0_10px_24px_rgba(32,72,66,0.22)]" : "text-[#5f6d67] hover:bg-white/70",
                )}
                onClick={() => setActiveView(item.id)}
              >
                <Icon className="mb-1 h-4 w-4" />
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
