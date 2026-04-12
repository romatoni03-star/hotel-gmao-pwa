/*
Design philosophy for this file: Mediterranean tectonic control system.
Prioritize calm under pressure, tactile clarity, compact domain language, and mobile-first operational reliability.
Every data structure should reinforce quick comprehension and low-friction offline use.
*/

import { nanoid } from "nanoid";

export type AppView = "dashboard" | "checklists" | "incidents" | "tasks";
export type ChecklistSectionKey =
  | "hvac"
  | "electrical"
  | "plumbing"
  | "pool"
  | "inspection"
  | "safety";
export type ItemStatus = "ok" | "issue";
export type Priority = "low" | "medium" | "high" | "critical";
export type WorkStatus = "open" | "in-progress" | "closed";
export type TaskType = "preventive" | "corrective";

export interface ChecklistTemplateItem {
  id: string;
  label: string;
}

export interface ChecklistSection {
  key: ChecklistSectionKey;
  title: string;
  critical: boolean;
  items: ChecklistTemplateItem[];
}

export interface ChecklistEntry {
  checked: boolean;
  status: ItemStatus;
  note: string;
  timestamp: string | null;
}

export interface DailyChecklistRecord {
  date: string;
  entries: Record<string, ChecklistEntry>;
}

export interface IncidentRecord {
  id: string;
  area: ChecklistSectionKey;
  description: string;
  priority: Priority;
  status: WorkStatus;
  timestamp: string;
  photoName?: string;
}

export interface TaskRecord {
  id: string;
  area: ChecklistSectionKey;
  type: TaskType;
  assignedTechnician: string;
  status: WorkStatus;
  costEstimate: string;
  date: string;
}

export interface AppState {
  checklistByDate: Record<string, DailyChecklistRecord>;
  incidents: IncidentRecord[];
  tasks: TaskRecord[];
  lastSyncAt: string | null;
}

export const STORAGE_KEY = "hotel-gmao-pwa-state-v1";

export const AREA_OPTIONS: Array<{ value: ChecklistSectionKey; label: string }> = [
  { value: "hvac", label: "HVAC" },
  { value: "electrical", label: "Electricidad" },
  { value: "plumbing", label: "Fontanería" },
  { value: "pool", label: "Piscina" },
  { value: "inspection", label: "Inspección general" },
  { value: "safety", label: "Seguridad" },
];

export const PRIORITY_OPTIONS: Array<{ value: Priority; label: string }> = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
];

export const STATUS_OPTIONS: Array<{ value: WorkStatus; label: string }> = [
  { value: "open", label: "Abierta" },
  { value: "in-progress", label: "En curso" },
  { value: "closed", label: "Cerrada" },
];

export const TASK_TYPE_OPTIONS: Array<{ value: TaskType; label: string }> = [
  { value: "preventive", label: "Preventiva" },
  { value: "corrective", label: "Correctiva" },
];

export const checklistSections: ChecklistSection[] = [
  {
    key: "hvac",
    title: "HVAC",
    critical: true,
    items: [
      { id: "hvac-temp", label: "Temperatura impulsión estable" },
      { id: "hvac-filter", label: "Filtros revisados" },
      { id: "hvac-noise", label: "Sin ruido anómalo en equipos" },
    ],
  },
  {
    key: "electrical",
    title: "Electricidad",
    critical: true,
    items: [
      { id: "electrical-panels", label: "Cuadros sin alarmas" },
      { id: "electrical-backup", label: "Grupo/SAI operativo" },
      { id: "electrical-lighting", label: "Zonas comunes iluminadas" },
    ],
  },
  {
    key: "plumbing",
    title: "Fontanería",
    critical: false,
    items: [
      { id: "plumbing-pressure", label: "Presión de agua correcta" },
      { id: "plumbing-leaks", label: "Sin fugas visibles" },
      { id: "plumbing-hotwater", label: "ACS disponible" },
    ],
  },
  {
    key: "pool",
    title: "Piscina",
    critical: true,
    items: [
      { id: "pool-ph", label: "pH dentro de rango" },
      { id: "pool-filtration", label: "Filtración operativa" },
      { id: "pool-pumps", label: "Bombas sin incidencia" },
    ],
  },
  {
    key: "inspection",
    title: "Inspección general",
    critical: false,
    items: [
      { id: "inspection-guest", label: "Sin impacto visible al huésped" },
      { id: "inspection-backofhouse", label: "Back-of-house ordenado" },
      { id: "inspection-rooms", label: "Habitaciones críticas verificadas" },
    ],
  },
  {
    key: "safety",
    title: "Seguridad",
    critical: true,
    items: [
      { id: "safety-fire", label: "Central de incendios normal" },
      { id: "safety-extinguishers", label: "Extintores visibles y accesibles" },
      { id: "safety-exits", label: "Salidas despejadas" },
    ],
  },
];

export function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function getAreaLabel(area: ChecklistSectionKey) {
  return AREA_OPTIONS.find((option) => option.value === area)?.label ?? area;
}

export function getPriorityTone(priority: Priority) {
  return {
    low: "bg-[rgba(92,128,111,0.14)] text-[#264437] border-[rgba(92,128,111,0.22)]",
    medium: "bg-[rgba(190,146,76,0.14)] text-[#6f4f1f] border-[rgba(190,146,76,0.26)]",
    high: "bg-[rgba(182,102,66,0.14)] text-[#7d3d1d] border-[rgba(182,102,66,0.26)]",
    critical: "bg-[rgba(155,67,50,0.14)] text-[#7d231b] border-[rgba(155,67,50,0.32)]",
  }[priority];
}

export function getStatusTone(status: WorkStatus | ItemStatus) {
  return {
    ok: "bg-[rgba(80,129,109,0.12)] text-[#234638] border-[rgba(80,129,109,0.22)]",
    issue: "bg-[rgba(171,88,69,0.12)] text-[#7b2d1e] border-[rgba(171,88,69,0.28)]",
    open: "bg-[rgba(167,96,71,0.12)] text-[#7a321f] border-[rgba(167,96,71,0.24)]",
    "in-progress": "bg-[rgba(46,87,96,0.12)] text-[#234e58] border-[rgba(46,87,96,0.24)]",
    closed: "bg-[rgba(92,128,111,0.12)] text-[#27463c] border-[rgba(92,128,111,0.24)]",
  }[status];
}

export function buildEmptyChecklist(date = getTodayKey()): DailyChecklistRecord {
  const entries = Object.fromEntries(
    checklistSections.flatMap((section) =>
      section.items.map((item) => [
        item.id,
        { checked: false, status: "ok" as ItemStatus, note: "", timestamp: null },
      ]),
    ),
  );

  return { date, entries };
}

export function buildInitialState(): AppState {
  const today = getTodayKey();

  return {
    checklistByDate: {
      [today]: buildEmptyChecklist(today),
    },
    incidents: [
      {
        id: `INC-${nanoid(6).toUpperCase()}`,
        area: "hvac",
        description: "Temperatura irregular en pasillo de habitaciones 200.",
        priority: "high",
        status: "in-progress",
        timestamp: new Date().toISOString(),
      },
      {
        id: `INC-${nanoid(6).toUpperCase()}`,
        area: "pool",
        description: "Lectura de cloro para revisión manual en sala técnica.",
        priority: "critical",
        status: "open",
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
    ],
    tasks: [
      {
        id: `WO-${nanoid(6).toUpperCase()}`,
        area: "electrical",
        type: "preventive",
        assignedTechnician: "Marc",
        status: "closed",
        costEstimate: "120 €",
        date: today,
      },
      {
        id: `WO-${nanoid(6).toUpperCase()}`,
        area: "plumbing",
        type: "corrective",
        assignedTechnician: "Nora",
        status: "open",
        costEstimate: "80 €",
        date: today,
      },
    ],
    lastSyncAt: null,
  };
}

export function readState(): AppState {
  if (typeof window === "undefined") return buildInitialState();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return buildInitialState();

  try {
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      checklistByDate: parsed.checklistByDate ?? {},
      incidents: parsed.incidents ?? [],
      tasks: parsed.tasks ?? [],
      lastSyncAt: parsed.lastSyncAt ?? null,
    };
  } catch {
    return buildInitialState();
  }
}

export function persistState(state: AppState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function ensureChecklistRecord(
  state: AppState,
  date: string,
): DailyChecklistRecord {
  return state.checklistByDate[date] ?? buildEmptyChecklist(date);
}

export function calculateChecklistCompletion(record: DailyChecklistRecord) {
  const values = Object.values(record.entries);
  const completed = values.filter((item) => item.checked).length;
  const total = values.length || 1;
  return Math.round((completed / total) * 100);
}

export function countCriticalIssues(state: AppState) {
  return state.incidents.filter(
    (incident) => incident.priority === "critical" && incident.status !== "closed",
  ).length;
}

export function countOpenIncidents(state: AppState) {
  return state.incidents.filter((incident) => incident.status !== "closed").length;
}

export function countTasksCompletedToday(state: AppState, date: string) {
  return state.tasks.filter((task) => task.date === date && task.status === "closed").length;
}

export function getTodayUrgency(state: AppState) {
  if (countCriticalIssues(state) > 0) return "Atención inmediata";
  if (countOpenIncidents(state) > 3) return "Carga elevada";
  return "Operación estable";
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
