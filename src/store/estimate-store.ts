import { create } from "zustand";
import { roundByPolicy, type RoundingPolicy } from "@/lib/utils";
import type { RaidType } from "@/lib/cctv-storage";

// ─── Types matching the calculator.ts ───────────────────────────────────

export interface CameraEntry {
  type: string;
  model: string; // SKU del modelo seleccionado desde la BD de Precios
  qty: number;
  hasPoE: boolean;
}

export type NvrRecordingType = "CONTINUOUS_24_7" | "MOTION";

// ─── Workstation Configuration ──────────────────────────────────────────────

export interface WorkstationConfig {
  /** Cantidad de cámaras en el sistema (para cálculo de estaciones) */
  cameraCount: number;
  /** Bitrate por cámara en Mbps (substream) */
  bitratePerCamera: number;
  /** Cámaras visibles simultáneamente por pantalla */
  camerasPerScreen: number;
  /** Número de estaciones deseadas (manual) */
  desiredStations: number;
  /** Cantidad de pantallas 43" para video wall */
  screen43Qty: number;
  /** Cantidad de pantallas 55" para video wall */
  screen55Qty: number;
  /** Cantidad de bases de escritorio */
  monitorArmQty: number;
  /** Cantidad de computadoras de alto rendimiento */
  workstationPCQty: number;
}

export interface CctvConfig {
  cameras: CameraEntry[];
  nvr: {
    qty: number;
    bays: number;
    recordingDays: number;
    totalStorageTB: number;
    recordingType: NvrRecordingType;
    mbpsPerCamera: number;
    motionActivityFactor: number;
    diskNominalTB: number;
    raid: RaidType;
    nvrModel: string;
    storageTB?: number;
    disksPerBay?: number;
  };
  avgDistanceMeters: number;
  licenses: number;
  fixedSwitchPorts: number;
  conduitMode: "ML" | "LOTE";
  useDetailedServices: boolean;
  cablingInstallMode: "POR_CAMARA" | "LOTE";
  includeCertificationLabeling: boolean;
  includeAsBuilt: boolean;
  includeCablingInstall: boolean;
  includeCctvInstallConfig: boolean;
  includeMisc: boolean;
  /** Configuración de estaciones de trabajo */
  workstation: WorkstationConfig;
  // Backward-compat (valores antiguos que podrían existir en BD)
  switches?: number;
  ups?: number;
  racks?: number;
  monitors?: number;
  services?: number;
}

export interface AccessConfig {
  doors: number;
  readerType: string;
  readerModelSku: string;
  controllers: number;
  controllerModelSku: string;
  turnstiles: number;
  magneticLocks: number;
  exitButtons: number;
  touchlessButtons: number;
  avgDistanceMeters: number;
  softwareLicenses: number;
}

export interface SpeakerEntry {
  type: string;
  qty: number;
}

export interface PagingConfig {
  speakers: SpeakerEntry[];
  amplifiers: { qty: number; watts: number };
  zones: number;
  gateways: number;
  avgDistanceMeters: number;
  bluetoothSpeakers: number;
}

export interface FireConfig {
  smokeDetectors: number;
  heatDetectors: number;
  manualStations: number;
  strobes: number;
  hornStrobes: number;
  coDetectors: number;
  panels: { qty: number; loops: number };
  annunciators: number;
  avgDistanceMeters: number;
}

export interface EstimateFactors {
  wasteFactorCable: number;
  wasteFactorConduit: number;
  verticalDrop: number;
  rackAllowance: number;
  indirectFactor: number;
  utilityFactor: number;
  /** Política de redondeo global (TASK §10, §11.4). */
  roundingPolicy: RoundingPolicy;
  /** Tasa de IVA (TASK §9.1, §10). */
  ivaRate: number;
  /** Tarifas de mano de obra por hora-hombre (TASK §6, §9.5). */
  laborRates: { technician: number; officer: number; helper: number };
  /** Activar cálculo por cuadrilla (TASK §6). */
  useCrewBasedLabor: boolean;
}

export interface LineItem {
  /** Identificador único interno (TASK §18.2). */
  id: string;
  partida: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitCost: number;
  total: number;
  totalAmount?: number;
  system: string;
  category: string;
  marca?: string;
  modelo?: string;
}

export interface CalculationResult {
  lineItems: LineItem[];
  subtotalMaterials: number;
  subtotalLabor: number;
  subtotalEngineering: number;
  subtotalDirect: number;
  subtotalIndirects: number;
  subtotalUtility: number;
  grandTotal: number;
  iva: number;
  totalWithIva: number;
}

export interface FloorplanDevice {
  id: string;
  system: "cctv" | "access" | "paging" | "fire" | "extinguisher" | "emergency_exit";
  subType: string;
  x: number;
  y: number;
  idfId?: string;
  calculatedDistanceM?: number;
  verticalDropM?: number;
  extinguisherData?: {
    type: any;
    capacity: any;
    riskZone: any;
    mountingHeight?: number;
    signalingHeight?: number;
    coverageRadiusMeters?: number;
    hasSignaling?: boolean;
    medicalArea?: string;
  };
}

export interface FloorplanRack {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface PathwayNode {
  id: string;
  x: number;
  y: number;
}

export interface PathwaySegment {
  id: string;
  fromId: string;
  toId: string;
}

export interface BuildingLevel {
  id: string;
  name: string;
  code: string;
  order: number;
}

export const DEFAULT_BUILDING_LEVELS: BuildingLevel[] = [
  { id: "level_pb", name: "Planta Baja (PB)", code: "PB", order: 1 },
  { id: "level_n2", name: "Nivel 2 (N2)", code: "N2", order: 2 },
  { id: "level_n3", name: "Nivel 3 (N3)", code: "N3", order: 3 },
  { id: "level_n4", name: "Nivel 4 (N4)", code: "N4", order: 4 },
  { id: "level_az5", name: "Azotea 5", code: "AZ5", order: 5 },
];

export interface ExclusionZoneItem {
  id: string;
  name?: string;
  points: Array<{ x: number; y: number }>;
}

export interface FireLoopItem {
  id: string;
  name: string;
  cableType: "FPLR_2x18" | "FPLR_2x14";
  wiringClass: "A" | "B";
  deviceIds: string[];
}

export interface FloorplanItem {
  id: string;
  name: string;
  levelId?: string; // ID del Nivel de Edificio asociado (PB, N2, N3, N4, Azotea 5)
  imageUrl: string | null;
  scaleMetersPerPx: number; // m/px
  racks: FloorplanRack[];
  devices: FloorplanDevice[];
  pathwayNodes?: PathwayNode[];
  pathwaySegments?: PathwaySegment[];
  exclusionZones?: ExclusionZoneItem[];
  fireLoops?: FireLoopItem[];
  hLosaM?: number;
  hPlafonM?: number;
  rackRiseM?: number;
  slackM?: number;
}

export type FloorplanConfig = FloorplanItem;

// ─── Store interface ────────────────────────────────────────────────────

interface EstimateStore {
  // Estimate metadata
  estimateId: string | null;
  /** ID del proyecto seleccionado en "Presupuestos Recientes" para aislamiento de Cronograma */
  activeEstimateId: string | null;
  name: string;
  clientName: string;
  projectName: string;
  currency: "MXN" | "USD";
  revision: string;
  responsible: string;
  notes: string;
  factorsNotes: string;

  // System configs & Building Levels
  buildingLevels: BuildingLevel[];
  cctvConfig: CctvConfig;
  accessConfig: AccessConfig;
  pagingConfig: PagingConfig;
  fireConfig: FireConfig;
  floorplans: FloorplanItem[];
  activeFloorplanId: string;
  floorplanConfig: FloorplanItem;
  floorplanHistory: FloorplanItem[];

  // Factors
  factors: EstimateFactors;

  // Results
  result: CalculationResult | null;
  isCalculating: boolean;
  /**
   * Indica que el `result` tiene ediciones manuales pendientes de
   * persistir en BD. Se activa en `updateLineItem` y se limpia al
   * guardar/recargar.
   */
  isDirty: boolean;
  /**
   * Snapshot inmutable del último resultado persistido en BD, usado para
   * revertir cambios manuales con `revertLineItems()`.
   */
  savedResult: CalculationResult | null;

  // Active view
  activeView: "config" | "prices" | "budget" | "floorplan";

  // Actions
  setEstimateId: (id: string) => void;
  /** Establece el proyecto activo seleccionado en "Presupuestos Recientes" */
  setActiveEstimate: (id: string | null) => void;
  setName: (name: string) => void;
  setClientName: (name: string) => void;
  setProjectName: (name: string) => void;
  setCurrency: (c: "MXN" | "USD") => void;
  setRevision: (rev: string) => void;
  setResponsible: (name: string) => void;
  setNotes: (notes: string) => void;
  setFactorsNotes: (notes: string) => void;
  setCctvConfig: (config: CctvConfig) => void;
  setAccessConfig: (config: AccessConfig) => void;
  setPagingConfig: (config: PagingConfig) => void;
  setFireConfig: (config: FireConfig) => void;
  setFloorplans: (floorplans: FloorplanItem[], activeId?: string) => void;
  setActiveFloorplanId: (id: string) => void;
  addBuildingLevel: (name: string, code?: string) => string;
  renameBuildingLevel: (id: string, name: string, code?: string) => void;
  deleteBuildingLevel: (id: string) => void;
  setFloorplanLevel: (floorplanId: string, levelId: string) => void;
  addFloorplan: (name?: string, levelId?: string) => string;
  renameFloorplan: (id: string, name: string) => void;
  deleteFloorplan: (id: string) => void;
  duplicateFloorplan: (id: string) => string;
  setFloorplanConfig: (config: FloorplanItem) => void;
  setFloorplanImage: (imageUrl: string | null) => void;
  setFloorplanScale: (scaleMetersPerPx: number) => void;
  addFloorplanRack: (rack: Omit<FloorplanRack, "id">) => void;
  removeFloorplanRack: (id: string) => void;
  addFloorplanDevice: (device: Omit<FloorplanDevice, "id"> & { id?: string }) => void;
  removeFloorplanDevice: (id: string) => void;
  addPathwayNode: (node: Omit<PathwayNode, "id">) => string;
  updatePathwayNode: (id: string, x: number, y: number) => void;
  removePathwayNode: (id: string) => void;
  addPathwaySegment: (segment: Omit<PathwaySegment, "id">) => void;
  removePathwaySegment: (id: string) => void;
  clearPathways: () => void;
  copyPathwayFromFloorplan: (sourceFloorplanId: string, targetFloorplanId?: string) => void;
  clearFloorplanDevices: () => void;
  clearFloorplan: () => void;
  undoFloorplan: () => void;
  setFactors: (factors: EstimateFactors) => void;
  setResult: (result: CalculationResult | null) => void;
  setIsCalculating: (v: boolean) => void;
  setActiveView: (v: "config" | "prices" | "budget" | "floorplan") => void;
  loadEstimate: (data: Record<string, unknown>) => void;
  resetAll: () => void;
  // Live editing actions (Budget view)
  updateLineItem: (id: string, patch: Partial<Pick<LineItem, "quantity" | "unitCost" | "code">>) => void;
  addLineItem: (newItemData: Omit<LineItem, "id" | "partida" | "total"> & { id?: string; partida?: string }) => void;
  removeLineItem: (id: string) => void;
  /** Limpia el flag `isDirty` después de persistir las líneas en BD. */
  markResultPersisted: () => void;
  /** Revierte las ediciones manuales al último snapshot persistido. */
  revertLineItems: () => void;
  /** Persiste inmediatamente la versión editada del presupuesto en la base de datos. */
  saveEstimateToDb: () => Promise<boolean>;
  /** Registra un evento en el historial de modificaciones del presupuesto activo. */
  logHistoryEntry: (changeType: string, details: string) => Promise<void>;
  /** Restaura una versión del presupuesto desde un snapshot de historial. */
  restoreHistoryVersion: (snapshotRaw: string | Record<string, unknown>) => boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────

function genId(prefix = "li"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeLineItem(
  raw: LineItem | (LineItem & { totalAmount?: number })
): LineItem {
  const total =
    typeof (raw as LineItem).total === "number"
      ? (raw as LineItem).total
      : typeof (raw as { totalAmount?: number }).totalAmount === "number"
        ? (raw as { totalAmount: number }).totalAmount
        : 0;
  const quantity = Number(raw.quantity) || 0;
  const unitCost = Number(raw.unitCost) || 0;
  // Importe = Cantidad × P.U. (regenerado para garantizar consistencia, TASK §7)
  return {
    ...raw,
    id: raw.id || genId(),
    quantity,
    unitCost,
    total: roundByPolicy(quantity * unitCost, 2),
  };
}

/**
 * Normalizadores defensivos para los configs de sistema (BUG: loadEstimate
 * podía entregar `cctvConfig.cameras = undefined` o un objeto sin speakers,
 * causando "Cannot read properties of undefined" en CctvForm/PagingForm).
 *
 * Cada función garantiza que todos los campos requeridos existan y tengan
 * tipos coherentes, fusionando con los defaults cuando faltan datos.
 */
function normalizeCctvConfig(raw: unknown): CctvConfig {
  const base = raw as Partial<CctvConfig> | undefined;
  const cameras = Array.isArray(base?.cameras)
    ? base!.cameras
        .filter((c) => c != null)
        .map((c) => ({
          type: String(c.type ?? "IP Bullet"),
          model: String(c.model ?? ""),
          qty: Number(c.qty) || 0,
          hasPoE: typeof c.hasPoE === "boolean" ? c.hasPoE : true,
        }))
    : defaultCctv.cameras;
  const rawRaid = String((base as any)?.nvr?.raid ?? "").trim().toUpperCase();
  const raid: RaidType =
    rawRaid === "RAID1" || rawRaid === "RAID5" || rawRaid === "RAID6" || rawRaid === "RAID10"
      ? (rawRaid as RaidType)
      : "NONE";
  const rawRecordingType = String((base as any)?.nvr?.recordingType ?? "").trim().toUpperCase();
  const recordingType: NvrRecordingType =
    rawRecordingType === "MOTION" ? "MOTION" : "CONTINUOUS_24_7";
  const nvr = base?.nvr
    ? {
        qty: Number((base as any).nvr.qty) || 0,
        bays: Number((base as any).nvr.bays) || 2,
        recordingDays: Number((base as any).nvr.recordingDays ?? defaultCctv.nvr.recordingDays) || defaultCctv.nvr.recordingDays,
        totalStorageTB: Number((base as any).nvr.totalStorageTB ?? defaultCctv.nvr.totalStorageTB) || defaultCctv.nvr.totalStorageTB,
        recordingType,
        mbpsPerCamera: Number((base as any).nvr.mbpsPerCamera ?? defaultCctv.nvr.mbpsPerCamera) || defaultCctv.nvr.mbpsPerCamera,
        motionActivityFactor: Number((base as any).nvr.motionActivityFactor ?? defaultCctv.nvr.motionActivityFactor) || defaultCctv.nvr.motionActivityFactor,
        diskNominalTB: Number((base as any).nvr.diskNominalTB ?? defaultCctv.nvr.diskNominalTB) || defaultCctv.nvr.diskNominalTB,
        raid,
        nvrModel: String((base as any).nvr.nvrModel ?? ""),
        storageTB: typeof (base as any).nvr.storageTB === "number" ? Number((base as any).nvr.storageTB) : undefined,
        disksPerBay: typeof (base as any).nvr.disksPerBay === "number" ? Number((base as any).nvr.disksPerBay) : undefined,
      }
    : defaultCctv.nvr;

  // Workstation config normalization
  const rawWorkstation = (base as any)?.workstation;
  const workstation: WorkstationConfig = rawWorkstation
    ? {
        cameraCount: Number(rawWorkstation.cameraCount) || 0,
        bitratePerCamera: Number(rawWorkstation.bitratePerCamera) || 4,
        camerasPerScreen: Number(rawWorkstation.camerasPerScreen) || 9,
        desiredStations:
          typeof rawWorkstation.desiredStations === "number"
            ? Math.max(0, rawWorkstation.desiredStations)
            : Math.max(0, Number(rawWorkstation.desiredStations) || 0),
        screen43Qty: Number(rawWorkstation.screen43Qty) || 0,
        screen55Qty: Number(rawWorkstation.screen55Qty) || 0,
        monitorArmQty: Number(rawWorkstation.monitorArmQty) || 0,
        workstationPCQty: Number(rawWorkstation.workstationPCQty) || 0,
      }
    : defaultCctv.workstation;

  return {
    cameras,
    nvr,
    avgDistanceMeters: Number(base?.avgDistanceMeters) || defaultCctv.avgDistanceMeters,
    licenses: Number(base?.licenses) || 0,
    fixedSwitchPorts: Number((base as any)?.fixedSwitchPorts ?? 4) || 4,
    conduitMode: ((base as any)?.conduitMode === "ML" ? "ML" : "LOTE"),
    useDetailedServices: typeof (base as any)?.useDetailedServices === "boolean" ? (base as any).useDetailedServices : true,
    cablingInstallMode: ((base as any)?.cablingInstallMode === "LOTE" ? "LOTE" : "POR_CAMARA"),
    includeCertificationLabeling: typeof (base as any)?.includeCertificationLabeling === "boolean" ? (base as any).includeCertificationLabeling : true,
    includeAsBuilt: typeof (base as any)?.includeAsBuilt === "boolean" ? (base as any).includeAsBuilt : true,
    includeCablingInstall: typeof (base as any)?.includeCablingInstall === "boolean" ? (base as any).includeCablingInstall : true,
    includeCctvInstallConfig: typeof (base as any)?.includeCctvInstallConfig === "boolean" ? (base as any).includeCctvInstallConfig : true,
    includeMisc: typeof (base as any)?.includeMisc === "boolean" ? (base as any).includeMisc : true,
    workstation,
    // legacy passthrough
    switches: typeof (base as any)?.switches === "number" ? Number((base as any).switches) : undefined,
    ups: typeof (base as any)?.ups === "number" ? Number((base as any).ups) : undefined,
    racks: typeof (base as any)?.racks === "number" ? Number((base as any).racks) : undefined,
    monitors: typeof (base as any)?.monitors === "number" ? Number((base as any).monitors) : undefined,
    services: typeof (base as any)?.services === "number" ? Number((base as any).services) : undefined,
  };
}

function normalizeAccessConfig(raw: unknown): AccessConfig {
  const base = raw as Partial<AccessConfig> | undefined;
  return {
    doors: Number(base?.doors) || 0,
    readerType: String(base?.readerType ?? "Biometrica"),
    readerModelSku: String((base as any)?.readerModelSku ?? ""),
    controllers: Number(base?.controllers) || 0,
    controllerModelSku: String((base as any)?.controllerModelSku ?? ""),
    turnstiles: Number(base?.turnstiles) || 0,
    magneticLocks: Number(base?.magneticLocks) || 0,
    exitButtons: Number(base?.exitButtons) || 0,
    touchlessButtons: Number(base?.touchlessButtons) || 0,
    avgDistanceMeters: Number(base?.avgDistanceMeters) || defaultAccess.avgDistanceMeters,
    softwareLicenses: Number(base?.softwareLicenses) || 0,
  };
}

function normalizePagingConfig(raw: unknown): PagingConfig {
  const base = raw as Partial<PagingConfig> | undefined;
  const speakers = Array.isArray(base?.speakers)
    ? base!.speakers
        .filter((s) => s != null)
        .map((s) => ({
          type: String(s.type ?? "Techo (Plafon)"),
          qty: Number(s.qty) || 0,
        }))
    : defaultPaging.speakers;
  const amplifiers = base?.amplifiers
    ? {
        qty: Number(base.amplifiers.qty) || 0,
        watts: Number(base.amplifiers.watts) || 120,
      }
    : defaultPaging.amplifiers;
  return {
    speakers,
    amplifiers,
    zones: Number(base?.zones) || 1,
    gateways: Number(base?.gateways) || 0,
    avgDistanceMeters: Number(base?.avgDistanceMeters) || defaultPaging.avgDistanceMeters,
    bluetoothSpeakers: Number(base?.bluetoothSpeakers) || 0,
  };
}

function normalizeFireConfig(raw: unknown): FireConfig {
  const base = raw as Partial<FireConfig> | undefined;
  const panels = base?.panels
    ? {
        qty: Number(base.panels.qty) || 0,
        loops: Number(base.panels.loops) || 1,
      }
    : defaultFire.panels;
  return {
    smokeDetectors: Number(base?.smokeDetectors) || 0,
    heatDetectors: Number(base?.heatDetectors) || 0,
    manualStations: Number(base?.manualStations) || 0,
    strobes: Number(base?.strobes) || 0,
    hornStrobes: Number(base?.hornStrobes) || 0,
    coDetectors: Number(base?.coDetectors) || 0,
    panels,
    annunciators: Number(base?.annunciators) || 0,
    avgDistanceMeters: Number(base?.avgDistanceMeters) || defaultFire.avgDistanceMeters,
  };
}

function normalizeFloorplanItem(raw: unknown, defaultId = "fp_1", defaultName = "Planta Baja"): FloorplanItem {
  const base = raw as Partial<FloorplanItem> | undefined;
  const id = String(base?.id || defaultId);
  const name = String(base?.name || defaultName);
  let levelId = String(base?.levelId || "");
  const n = name.toLowerCase();
  if (!levelId || levelId === "level_pb") {
    if (n.includes("nivel 2") || n.includes("n2") || n.includes("plano n2")) levelId = "level_n2";
    else if (n.includes("nivel 3") || n.includes("n3") || n.includes("plano n3")) levelId = "level_n3";
    else if (n.includes("nivel 4") || n.includes("n4") || n.includes("plano n4")) levelId = "level_n4";
    else if (n.includes("azotea") || n.includes("az5") || n.includes("n5")) levelId = "level_az5";
    else if (n.includes("baja") || n.includes("pb")) levelId = "level_pb";
    else if (!levelId) levelId = "level_pb";
  }
  const racks = Array.isArray(base?.racks)
    ? base!.racks
        .filter((r) => r != null)
        .map((r, i) => ({
          id: String(r.id || `rack_${i + 1}`),
          name: String(r.name || `IDF ${i + 1}`),
          x: Number(r.x) || 0,
          y: Number(r.y) || 0,
        }))
    : defaultFloorplan.racks;
  const devices = Array.isArray(base?.devices)
    ? base!.devices
        .filter((d) => d != null)
        .map((d, i) => ({
          id: String(d.id || `dev_${i + 1}`),
          system: (["cctv", "access", "paging", "fire", "extinguisher", "emergency_exit"].includes(String(d.system).toLowerCase())
            ? String(d.system).toLowerCase()
            : "cctv") as "cctv" | "access" | "paging" | "fire" | "extinguisher" | "emergency_exit",
          subType: String(d.subType || "IP Bullet"),
          x: Number(d.x) || 0,
          y: Number(d.y) || 0,
          idfId: d.idfId ? String(d.idfId) : undefined,
          calculatedDistanceM: typeof d.calculatedDistanceM === "number" ? d.calculatedDistanceM : undefined,
          verticalDropM: typeof d.verticalDropM === "number" ? d.verticalDropM : undefined,
          extinguisherData: d.extinguisherData
            ? {
                type: d.extinguisherData.type,
                capacity: d.extinguisherData.capacity,
                riskZone: d.extinguisherData.riskZone,
                mountingHeight: typeof d.extinguisherData.mountingHeight === "number" ? d.extinguisherData.mountingHeight : undefined,
                signalingHeight: typeof d.extinguisherData.signalingHeight === "number" ? d.extinguisherData.signalingHeight : undefined,
                coverageRadiusMeters: typeof d.extinguisherData.coverageRadiusMeters === "number" ? d.extinguisherData.coverageRadiusMeters : undefined,
                hasSignaling: typeof d.extinguisherData.hasSignaling === "boolean" ? d.extinguisherData.hasSignaling : undefined,
                medicalArea: d.extinguisherData.medicalArea ? String(d.extinguisherData.medicalArea) : undefined,
              }
            : undefined,
        }))
    : defaultFloorplan.devices;

  return {
    id,
    name,
    levelId,
    imageUrl: typeof base?.imageUrl === "string" ? base.imageUrl : null,
    scaleMetersPerPx: Number(base?.scaleMetersPerPx) || defaultFloorplan.scaleMetersPerPx,
    racks,
    devices,
    pathwayNodes: Array.isArray(base?.pathwayNodes)
      ? base!.pathwayNodes
          .filter((n) => n != null)
          .map((n, i) => ({
            id: String(n.id || `pnode_${i + 1}`),
            x: Number(n.x) || 0,
            y: Number(n.y) || 0,
          }))
      : [],
    pathwaySegments: Array.isArray(base?.pathwaySegments)
      ? base!.pathwaySegments
          .filter((s) => s != null)
          .map((s, i) => ({
            id: String(s.id || `pseg_${i + 1}`),
            fromId: String(s.fromId || ""),
            toId: String(s.toId || ""),
          }))
      : [],
    exclusionZones: Array.isArray(base?.exclusionZones)
      ? base!.exclusionZones
          .filter((z: any) => z != null && (Array.isArray(z.points) || Array.isArray(z.puntos)))
          .map((z: any, i: number) => {
            const rawPts = Array.isArray(z.points) ? z.points : Array.isArray(z.puntos) ? z.puntos : [];
            return {
              id: String(z.id || `ez_${i + 1}`),
              name: String(z.name || `Zona ${i + 1}`),
              points: rawPts.map((pt: any) => ({ x: Number(pt.x) || 0, y: Number(pt.y) || 0 })),
            };
          })
      : [],
    fireLoops: Array.isArray(base?.fireLoops)
      ? base!.fireLoops
          .filter((l) => l != null)
          .map((l, i) => ({
            id: String(l.id || `loop_${i + 1}`),
            name: String(l.name || `Lazo SLC ${i + 1}`),
            cableType: (l.cableType === "FPLR_2x14" ? "FPLR_2x14" : "FPLR_2x18") as "FPLR_2x18" | "FPLR_2x14",
            wiringClass: (l.wiringClass === "A" ? "A" : "B") as "A" | "B",
            deviceIds: Array.isArray(l.deviceIds) ? l.deviceIds.map(String) : [],
          }))
      : [],
    hLosaM: Number(base?.hLosaM) || 3.8,
    hPlafonM: Number(base?.hPlafonM) || 3.0,
    rackRiseM: Number(base?.rackRiseM) || 2.5,
    slackM: Number(base?.slackM) || 4.0,
  };
}

export function normalizeFloorplanState(raw: unknown): {
  buildingLevels: BuildingLevel[];
  floorplans: FloorplanItem[];
  activeFloorplanId: string;
  floorplanConfig: FloorplanItem;
} {
  const base = raw as any;
  const buildingLevels: BuildingLevel[] = Array.isArray(base?.buildingLevels) && base.buildingLevels.length > 0
    ? base.buildingLevels.map((lvl: any, idx: number) => ({
        id: String(lvl.id || `level_${idx + 1}`),
        name: String(lvl.name || `Nivel ${idx + 1}`),
        code: String(lvl.code || `N${idx + 1}`),
        order: Number(lvl.order) || idx + 1,
      }))
    : DEFAULT_BUILDING_LEVELS;

  if (base && Array.isArray(base.floorplans) && base.floorplans.length > 0) {
    const floorplans = base.floorplans.map((fp: any, idx: number) =>
      normalizeFloorplanItem(fp, fp.id || `fp_${idx + 1}`, fp.name || `Plano ${idx + 1}`)
    );
    const activeId =
      typeof base.activeFloorplanId === "string" && floorplans.some((f: any) => f.id === base.activeFloorplanId)
        ? base.activeFloorplanId
        : floorplans[0].id;
    const activeFp = floorplans.find((f: any) => f.id === activeId) || floorplans[0];
    return {
      buildingLevels,
      floorplans,
      activeFloorplanId: activeId,
      floorplanConfig: activeFp,
    };
  }

  const single = normalizeFloorplanItem(raw, "fp_1", "Planta Baja");
  return {
    buildingLevels,
    floorplans: [single],
    activeFloorplanId: single.id,
    floorplanConfig: single,
  };
}

function normalizeFloorplanConfig(raw: unknown): FloorplanItem {
  return normalizeFloorplanState(raw).floorplanConfig;
}

function recalcFromLineItems(
  lineItems: LineItem[],
  indirectFactor: number,
  utilityFactor: number,
  ivaRate: number,
  roundingPolicy: RoundingPolicy
) {
  let materials = 0;
  let labor = 0;
  let engineering = 0;
  let services = 0;
  for (const item of lineItems) {
    if (item.category === "Mano de Obra") labor += item.total;
    else if (item.category === "Servicio") services += item.total;
    else if (item.category === "Ingeniería") engineering += item.total;
    else materials += item.total;
  }
  const r = (n: number) => roundByPolicy(n, roundingPolicy);
  const subtotalMaterials = r(materials);
  const subtotalLabor = r(labor);
  const subtotalEngineering = r(engineering);
  const subtotalDirect = r(materials + labor + engineering + services);
  const subtotalIndirects = r(subtotalDirect * indirectFactor);
  const subtotalUtility = r((subtotalDirect + subtotalIndirects) * utilityFactor);
  const grandTotal = r(subtotalDirect + subtotalIndirects + subtotalUtility);
  const iva = r(grandTotal * ivaRate);
  const totalWithIva = r(grandTotal + iva);
  return {
    subtotalMaterials,
    subtotalLabor,
    subtotalEngineering,
    subtotalDirect,
    subtotalIndirects,
    subtotalUtility,
    grandTotal,
    iva,
    totalWithIva,
  };
}

/**
 * Reindexa consecutivamente el campo `partida` para cada grupo de sistema.
 */
function reindexPartidas(lineItems: LineItem[]): LineItem[] {
  const SYSTEM_PARTIDA_PREFIX: Record<string, string> = {
    CCTV: "5.7.3",
    ACCESO: "5.7.4",
    VOCEO: "5.7.5",
    INCENDIO: "5.7.6",
    CANALIZACION: "5.7.1",
    CABLEADO: "5.7.2",
    GENERAL: "5.7.7",
  };

  const systemCounts: Record<string, number> = {};
  const systemPrefixMap: Record<string, string> = {};

  for (const item of lineItems) {
    if (item.partida && item.system && !systemPrefixMap[item.system]) {
      const lastDot = item.partida.lastIndexOf(".");
      if (lastDot > 0) {
        systemPrefixMap[item.system] = item.partida.substring(0, lastDot);
      }
    }
  }

  return lineItems.map((item) => {
    const sys = item.system || "GENERAL";
    systemCounts[sys] = (systemCounts[sys] || 0) + 1;
    const prefix = systemPrefixMap[sys] || SYSTEM_PARTIDA_PREFIX[sys] || "1.0";
    const newPartida = `${prefix}.${String(systemCounts[sys]).padStart(2, "0")}`;
    return {
      ...item,
      partida: newPartida,
    };
  });
}

// ─── Defaults ───────────────────────────────────────────────────────────

const defaultCctv: CctvConfig = {
  cameras: [
    { type: "IP Bullet", model: "", qty: 0, hasPoE: true },
    { type: "IP Domo", model: "", qty: 0, hasPoE: true },
    { type: "PTZ", model: "", qty: 0, hasPoE: true },
    { type: "Fisheye", model: "", qty: 0, hasPoE: true },
  ],
  nvr: { qty: 0, bays: 2, recordingDays: 30, totalStorageTB: 0, recordingType: "CONTINUOUS_24_7", mbpsPerCamera: 4, motionActivityFactor: 0.5, diskNominalTB: 10, raid: "NONE", nvrModel: "" },
  avgDistanceMeters: 50,
  licenses: 0,
  fixedSwitchPorts: 4,
  conduitMode: "LOTE",
  useDetailedServices: true,
  cablingInstallMode: "POR_CAMARA",
  includeCertificationLabeling: true,
  includeAsBuilt: true,
  includeCablingInstall: true,
  includeCctvInstallConfig: true,
  includeMisc: true,
  // Workstation config defaults
  workstation: {
    cameraCount: 0,
    bitratePerCamera: 4,
    camerasPerScreen: 9,
    desiredStations: 0,
    screen43Qty: 0,
    screen55Qty: 0,
    monitorArmQty: 0,
    workstationPCQty: 0,
  },
};

const defaultAccess: AccessConfig = {
  doors: 0,
  readerType: "Biometrica",
  readerModelSku: "",
  controllers: 0,
  controllerModelSku: "",
  turnstiles: 0,
  magneticLocks: 0,
  exitButtons: 0,
  touchlessButtons: 0,
  avgDistanceMeters: 40,
  softwareLicenses: 0,
};

const defaultPaging: PagingConfig = {
  speakers: [
    { type: "Techo (Plafon)", qty: 0 },
    { type: "Muro", qty: 0 },
    { type: "Exterior", qty: 0 },
    { type: "IP", qty: 0 },
  ],
  amplifiers: { qty: 0, watts: 120 },
  zones: 1,
  gateways: 0,
  avgDistanceMeters: 45,
  bluetoothSpeakers: 0,
};

const defaultFire: FireConfig = {
  smokeDetectors: 0,
  heatDetectors: 0,
  manualStations: 0,
  strobes: 0,
  hornStrobes: 0,
  coDetectors: 0,
  panels: { qty: 0, loops: 1 },
  annunciators: 0,
  avgDistanceMeters: 35,
};

const defaultFactors: EstimateFactors = {
  wasteFactorCable: 0.10,
  wasteFactorConduit: 0.15,
  verticalDrop: 3.0,
  rackAllowance: 5.0,
  indirectFactor: 0.12,
  utilityFactor: 0.15,
  roundingPolicy: 2,
  ivaRate: 0.16,
  // A2 - Mano de obra por cuadrilla
  laborRates: { technician: 950, officer: 750, helper: 500 },
  useCrewBasedLabor: false,
};

const defaultFloorplan: FloorplanConfig = {
  id: "fp_1",
  name: "Planta Baja",
  levelId: "level_pb",
  imageUrl: null,
  scaleMetersPerPx: 0.05,
  racks: [],
  devices: [],
  pathwayNodes: [],
  pathwaySegments: [],
  rackRiseM: 2.5,
  slackM: 4.0,
};

export function patchActiveFloorplan(
  state: { floorplans: FloorplanItem[]; activeFloorplanId: string },
  patchFn: (fp: FloorplanItem) => FloorplanItem
) {
  const activeId = state.activeFloorplanId || state.floorplans?.[0]?.id || "fp_1";
  const updatedFloorplans = (state.floorplans && state.floorplans.length > 0 ? state.floorplans : [defaultFloorplan]).map((fp) => {
    if (fp.id === activeId) {
      return patchFn(fp);
    }
    return fp;
  });
  const activeFp = updatedFloorplans.find((f) => f.id === activeId) || updatedFloorplans[0];
  return {
    floorplans: updatedFloorplans,
    activeFloorplanId: activeId,
    floorplanConfig: activeFp,
  };
}

// ─── Store ──────────────────────────────────────────────────────────────

export const useEstimateStore = create<EstimateStore>((set, get) => ({
  estimateId: null,
  activeEstimateId: null,
  name: "Nuevo Presupuesto",
  clientName: "",
  projectName: "",
  currency: "MXN",
  revision: "Rev. 1",
  responsible: "",
  notes: "",
  factorsNotes: "",

  buildingLevels: DEFAULT_BUILDING_LEVELS,
  cctvConfig: defaultCctv,
  accessConfig: defaultAccess,
  pagingConfig: defaultPaging,
  fireConfig: defaultFire,
  floorplans: [defaultFloorplan],
  activeFloorplanId: defaultFloorplan.id,
  floorplanConfig: defaultFloorplan,
  floorplanHistory: [],

  factors: defaultFactors,

  result: null,
  isCalculating: false,
  isDirty: false,
  savedResult: null,

  activeView: "config",

  setEstimateId: (id) => set({ estimateId: id }),
  setActiveEstimate: (id) => set({ activeEstimateId: id }),
  setName: (name) => set({ name }),
  setClientName: (name) => set({ clientName: name }),
  setProjectName: (name) => set({ projectName: name }),
  setCurrency: (c) => set({ currency: c }),
  setRevision: (revision) => set({ revision }),
  setResponsible: (responsible) => set({ responsible }),
  setNotes: (notes) => set({ notes }),
  setFactorsNotes: (factorsNotes) => set({ factorsNotes }),
  setCctvConfig: (cctvConfig) => set({ cctvConfig }),
  setAccessConfig: (accessConfig) => set({ accessConfig }),
  setPagingConfig: (pagingConfig) => set({ pagingConfig }),
  setFireConfig: (fireConfig) => set({ fireConfig }),
  setFloorplans: (floorplans, activeId) => {
    const norm = normalizeFloorplanState({ floorplans, activeFloorplanId: activeId });
    set({
      buildingLevels: norm.buildingLevels,
      floorplans: norm.floorplans,
      activeFloorplanId: norm.activeFloorplanId,
      floorplanConfig: norm.floorplanConfig,
    });
  },
  setActiveFloorplanId: (id) =>
    set((state) => {
      const activeFp = state.floorplans.find((f) => f.id === id) || state.floorplans[0];
      if (!activeFp) return state;
      return {
        activeFloorplanId: activeFp.id,
        floorplanConfig: activeFp,
      };
    }),
  addBuildingLevel: (name, code) => {
    const state = get();
    const newId = `level_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const nextOrder = state.buildingLevels.length + 1;
    const newLevel: BuildingLevel = {
      id: newId,
      name,
      code: code || name.slice(0, 4).toUpperCase(),
      order: nextOrder,
    };
    set({ buildingLevels: [...state.buildingLevels, newLevel] });
    return newId;
  },
  renameBuildingLevel: (id, name, code) => {
    const state = get();
    set({
      buildingLevels: state.buildingLevels.map((lvl) =>
        lvl.id === id ? { ...lvl, name, code: code || lvl.code } : lvl
      ),
    });
  },
  deleteBuildingLevel: (id) => {
    const state = get();
    if (state.buildingLevels.length <= 1) return;
    const filtered = state.buildingLevels.filter((lvl) => lvl.id !== id);
    const fallbackLevelId = filtered[0]?.id || "level_pb";
    set({
      buildingLevels: filtered,
      floorplans: state.floorplans.map((fp) => (fp.levelId === id ? { ...fp, levelId: fallbackLevelId } : fp)),
    });
  },
  setFloorplanLevel: (floorplanId, levelId) => {
    const state = get();
    set({
      floorplans: state.floorplans.map((fp) => (fp.id === floorplanId ? { ...fp, levelId } : fp)),
      floorplanConfig:
        state.floorplanConfig.id === floorplanId ? { ...state.floorplanConfig, levelId } : state.floorplanConfig,
    });
  },
  addFloorplan: (name, levelId) => {
    const state = get();
    const assignedLevel = levelId || state.buildingLevels[0]?.id || "level_pb";

    const newId = `fp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const count = state.floorplans.length + 1;
    const newFp: FloorplanItem = {
      ...defaultFloorplan,
      id: newId,
      name: name || `Plano ${count}`,
      levelId: assignedLevel,
      imageUrl: null,
      scaleMetersPerPx: 0.05,
      racks: [],
      devices: [],
      pathwayNodes: [],
      pathwaySegments: [],
      exclusionZones: [],
      fireLoops: [],
    };
    set({
      floorplans: [...state.floorplans, newFp],
      activeFloorplanId: newId,
      floorplanConfig: newFp,
    });
    return newId;
  },
  renameFloorplan: (id, name) =>
    set((state) => {
      const updated = state.floorplans.map((fp) => (fp.id === id ? { ...fp, name } : fp));
      const activeFp = updated.find((f) => f.id === state.activeFloorplanId) || updated[0];
      return {
        floorplans: updated,
        floorplanConfig: activeFp,
      };
    }),
  deleteFloorplan: (id) => {
    set((state) => {
      if (state.floorplans.length <= 1) return state;
      const updated = state.floorplans.filter((fp) => fp.id !== id);
      const activeId = state.activeFloorplanId === id ? updated[0].id : state.activeFloorplanId;
      const activeFp = updated.find((f) => f.id === activeId) || updated[0];
      return {
        floorplans: updated,
        activeFloorplanId: activeId,
        floorplanConfig: activeFp,
      };
    });
    const currentState = get();
    const estId = currentState.activeEstimateId || currentState.estimateId;
    if (estId) {
      fetch(`/api/estimates/${estId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          floorplanConfig: JSON.stringify({
            buildingLevels: currentState.buildingLevels,
            activeFloorplanId: currentState.activeFloorplanId,
            floorplans: currentState.floorplans,
          }),
        }),
      }).catch((e) => console.error("Error al persistir borrado de plano en BD:", e));
    }
  },
  duplicateFloorplan: (id) => {
    const state = get();
    const target = state.floorplans.find((fp) => fp.id === id);
    if (!target) return id;
    const newId = `fp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const duplicated: FloorplanItem = {
      ...target,
      id: newId,
      name: `${target.name} (Copia)`,
      racks: target.racks.map((r, i) => ({ ...r, id: `rack_${Date.now().toString(36)}_${i}` })),
      devices: target.devices.map((d, i) => ({ ...d, id: `dev_${Date.now().toString(36)}_${i}` })),
    };
    set({
      floorplans: [...state.floorplans, duplicated],
      activeFloorplanId: newId,
      floorplanConfig: duplicated,
    });
    return newId;
  },
  setFloorplanConfig: (floorplanConfig) =>
    set((state) => patchActiveFloorplan(state, () => floorplanConfig)),
  setFloorplanImage: (imageUrl) =>
    set((state) => patchActiveFloorplan(state, (fp) => ({ ...fp, imageUrl }))),
  setFloorplanScale: (scaleMetersPerPx) =>
    set((state) => patchActiveFloorplan(state, (fp) => ({ ...fp, scaleMetersPerPx }))),
  addFloorplanRack: (rackData) =>
    set((state) => {
      const newRack: FloorplanRack = {
        ...rackData,
        id: `rack_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      };
      const patched = patchActiveFloorplan(state, (fp) => ({
        ...fp,
        racks: [...fp.racks, newRack],
      }));
      return {
        ...patched,
        floorplanHistory: [...(state.floorplanHistory || []).slice(-19), state.floorplanConfig],
      };
    }),
  removeFloorplanRack: (id) =>
    set((state) => {
      const patched = patchActiveFloorplan(state, (fp) => ({
        ...fp,
        racks: fp.racks.filter((r) => r.id !== id),
      }));
      return {
        ...patched,
        floorplanHistory: [...(state.floorplanHistory || []).slice(-19), state.floorplanConfig],
      };
    }),
  addFloorplanDevice: (deviceData) =>
    set((state) => {
      const newDevice: FloorplanDevice = {
        ...deviceData,
        id: deviceData.id || `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      };
      const patched = patchActiveFloorplan(state, (fp) => ({
        ...fp,
        devices: [...fp.devices, newDevice],
      }));
      return {
        ...patched,
        floorplanHistory: [...(state.floorplanHistory || []).slice(-19), state.floorplanConfig],
      };
    }),
  removeFloorplanDevice: (id) =>
    set((state) => {
      const patched = patchActiveFloorplan(state, (fp) => ({
        ...fp,
        devices: fp.devices.filter((d) => d.id !== id),
      }));
      return {
        ...patched,
        floorplanHistory: [...(state.floorplanHistory || []).slice(-19), state.floorplanConfig],
      };
    }),
  addPathwayNode: (nodeData) => {
    const newId = `pn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const newNode: PathwayNode = { ...nodeData, id: newId };
    set((state) => {
      const patched = patchActiveFloorplan(state, (fp) => ({
        ...fp,
        pathwayNodes: [...(fp.pathwayNodes || []), newNode],
      }));
      return {
        ...patched,
        floorplanHistory: [...(state.floorplanHistory || []).slice(-19), state.floorplanConfig],
      };
    });
    return newId;
  },
  updatePathwayNode: (id, x, y) =>
    set((state) => {
      const patched = patchActiveFloorplan(state, (fp) => ({
        ...fp,
        pathwayNodes: (fp.pathwayNodes || []).map((n) => (n.id === id ? { ...n, x, y } : n)),
      }));
      return {
        ...patched,
      };
    }),
  removePathwayNode: (id) =>
    set((state) => {
      const patched = patchActiveFloorplan(state, (fp) => ({
        ...fp,
        pathwayNodes: (fp.pathwayNodes || []).filter((n) => n.id !== id),
        pathwaySegments: (fp.pathwaySegments || []).filter((s) => s.fromId !== id && s.toId !== id),
      }));
      return {
        ...patched,
        floorplanHistory: [...(state.floorplanHistory || []).slice(-19), state.floorplanConfig],
      };
    }),
  addPathwaySegment: (segmentData) =>
    set((state) => {
      const newSegment: PathwaySegment = {
        ...segmentData,
        id: `ps_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      };
      const patched = patchActiveFloorplan(state, (fp) => ({
        ...fp,
        pathwaySegments: [...(fp.pathwaySegments || []), newSegment],
      }));
      return {
        ...patched,
        floorplanHistory: [...(state.floorplanHistory || []).slice(-19), state.floorplanConfig],
      };
    }),
  removePathwaySegment: (id) =>
    set((state) => {
      const patched = patchActiveFloorplan(state, (fp) => ({
        ...fp,
        pathwaySegments: (fp.pathwaySegments || []).filter((s) => s.id !== id),
      }));
      return {
        ...patched,
        floorplanHistory: [...(state.floorplanHistory || []).slice(-19), state.floorplanConfig],
      };
    }),
  clearPathways: () =>
    set((state) => {
      const patched = patchActiveFloorplan(state, (fp) => ({
        ...fp,
        pathwayNodes: [],
        pathwaySegments: [],
      }));
      return {
        ...patched,
        floorplanHistory: [...(state.floorplanHistory || []).slice(-19), state.floorplanConfig],
      };
    }),
  copyPathwayFromFloorplan: (sourceFloorplanId, targetFloorplanId) =>
    set((state) => {
      const source = state.floorplans.find((fp) => fp.id === sourceFloorplanId);
      if (!source || !source.pathwayNodes || source.pathwayNodes.length === 0) return state;

      const targetId = targetFloorplanId || state.activeFloorplanId;
      const copiedNodes = (source.pathwayNodes || []).map((n) => ({ ...n }));
      const copiedSegments = (source.pathwaySegments || []).map((s) => ({ ...s }));

      const updated = state.floorplans.map((fp) =>
        fp.id === targetId
          ? {
              ...fp,
              pathwayNodes: copiedNodes,
              pathwaySegments: copiedSegments,
            }
          : fp
      );
      const activeFp = updated.find((f) => f.id === state.activeFloorplanId) || updated[0];
      return {
        floorplans: updated,
        floorplanConfig: activeFp,
        floorplanHistory: [...(state.floorplanHistory || []).slice(-19), state.floorplanConfig],
      };
    }),
  clearFloorplanDevices: () =>
    set((state) => {
      const patched = patchActiveFloorplan(state, (fp) => ({
        ...fp,
        devices: [],
      }));
      return {
        ...patched,
        floorplanHistory: [...(state.floorplanHistory || []).slice(-19), state.floorplanConfig],
      };
    }),
  clearFloorplan: () =>
    set((state) => {
      const patched = patchActiveFloorplan(state, (fp) => ({
        ...fp,
        devices: [],
        racks: [],
        pathwayNodes: [],
        pathwaySegments: [],
        exclusionZones: [],
        fireLoops: [],
      }));
      return {
        ...patched,
        floorplanHistory: [...(state.floorplanHistory || []).slice(-19), state.floorplanConfig],
      };
    }),
  undoFloorplan: () =>
    set((state) => {
      const history = state.floorplanHistory || [];
      if (history.length === 0) return state;
      const newHistory = [...history];
      const previousConfig = newHistory.pop()!;
      const patched = patchActiveFloorplan(state, () => previousConfig);
      return {
        ...patched,
        floorplanHistory: newHistory,
      };
    }),
  setFactors: (factors) => set({ factors }),
  setResult: (result) => {
    if (!result) {
      set({ result: null, savedResult: null, isDirty: false });
      return;
    }
    const lineItems = result.lineItems.map(normalizeLineItem);
    const { indirectFactor, utilityFactor, ivaRate, roundingPolicy } = get().factors;
    const recalc = recalcFromLineItems(
      lineItems,
      indirectFactor,
      utilityFactor,
      ivaRate,
      roundingPolicy
    );
    const finalResult = { ...result, lineItems, ...recalc };
    set({ result: finalResult, savedResult: finalResult, isDirty: false });
  },
  setIsCalculating: (v) => set({ isCalculating: v }),
  setActiveView: (activeView) => set({ activeView }),
  loadEstimate: (data) => {
    const rawItems = (data.lineItems as Array<LineItem | (LineItem & { totalAmount?: number })>) || [];
    const lineItems = rawItems.map(normalizeLineItem);
    const indirectFactor = (data.indirectFactor as number) ?? defaultFactors.indirectFactor;
    const utilityFactor = (data.utilityFactor as number) ?? defaultFactors.utilityFactor;
    const ivaRate = (data.ivaRate as number) ?? defaultFactors.ivaRate;
    const roundingPolicy = ((data.roundingPolicy as number) ?? defaultFactors.roundingPolicy) as RoundingPolicy;
    const recalc = recalcFromLineItems(
      lineItems,
      indirectFactor,
      utilityFactor,
      ivaRate,
      roundingPolicy
    );
    const loadedResult: CalculationResult | null = data.lineItems
      ? { lineItems, ...recalc }
      : null;
    const normFp = normalizeFloorplanState(data.floorplanConfig);
    set({
      estimateId: data.id as string,
      activeEstimateId: data.id as string,
      name: (data.name as string) || "Sin nombre",
      clientName: (data.clientName as string) || "",
      projectName: (data.projectName as string) || "",
      currency: ((data.currency as string) || "MXN") as "MXN" | "USD",
      revision: (data.revision as string) || "Rev. 1",
      responsible: (data.responsible as string) || "",
      notes: (data.notes as string) || "",
      factorsNotes: (data.factorsNotes as string) || "",
      buildingLevels: normFp.buildingLevels,
      cctvConfig: normalizeCctvConfig(data.cctvConfig),
      accessConfig: normalizeAccessConfig(data.accessConfig),
      pagingConfig: normalizePagingConfig(data.pagingConfig),
      fireConfig: normalizeFireConfig(data.fireConfig),
      floorplans: normFp.floorplans,
      activeFloorplanId: normFp.activeFloorplanId,
      floorplanConfig: normFp.floorplanConfig,
      floorplanHistory: [],
      factors: {
        wasteFactorCable: (data.wasteFactorCable as number) ?? defaultFactors.wasteFactorCable,
        wasteFactorConduit: (data.wasteFactorConduit as number) ?? defaultFactors.wasteFactorConduit,
        verticalDrop: (data.verticalDrop as number) ?? defaultFactors.verticalDrop,
        rackAllowance: (data.rackAllowance as number) ?? defaultFactors.rackAllowance,
        indirectFactor,
        utilityFactor,
        ivaRate,
        roundingPolicy,
        // A2
        laborRates: {
          technician: (data.laborTechnicianRate as number) ?? defaultFactors.laborRates.technician,
          officer: (data.laborOfficerRate as number) ?? defaultFactors.laborRates.officer,
          helper: (data.laborHelperRate as number) ?? defaultFactors.laborRates.helper,
        },
        useCrewBasedLabor: (data.useCrewBasedLabor as boolean) ?? defaultFactors.useCrewBasedLabor,
      },
      result: loadedResult,
      savedResult: loadedResult,
      isDirty: false,
    });
  },
  resetAll: () => {
    const initFp = defaultFloorplan;
    set({
      estimateId: null,
      activeEstimateId: null,
      name: "Nuevo Presupuesto",
      clientName: "",
      projectName: "",
      currency: "MXN",
      revision: "Rev. 1",
      responsible: "",
      notes: "",
      factorsNotes: "",
      cctvConfig: defaultCctv,
      accessConfig: defaultAccess,
      pagingConfig: defaultPaging,
      fireConfig: defaultFire,
      floorplans: [initFp],
      activeFloorplanId: initFp.id,
      floorplanConfig: initFp,
      floorplanHistory: [],
      factors: defaultFactors,
      result: null,
      isCalculating: false,
      isDirty: false,
      savedResult: null,
      activeView: "config",
    });
  },
  updateLineItem: (id, patch) => {
    const state = get();
    if (!state.result) return;
    const lineItems = state.result.lineItems.map((it) => {
      if (it.id !== id) return it;
      const quantity = patch.quantity !== undefined ? Number(patch.quantity) || 0 : it.quantity;
      const unitCost = patch.unitCost !== undefined ? Number(patch.unitCost) || 0 : it.unitCost;
      const code = patch.code !== undefined ? String(patch.code) : it.code;
      const total = roundByPolicy(quantity * unitCost, state.factors.roundingPolicy);
      return { ...it, code, quantity, unitCost, total };
    });
    const recalc = recalcFromLineItems(
      lineItems,
      state.factors.indirectFactor,
      state.factors.utilityFactor,
      state.factors.ivaRate,
      state.factors.roundingPolicy
    );
    set({ result: { ...state.result, lineItems, ...recalc }, isDirty: true });
  },
  addLineItem: (newItemData) => {
    const state = get();
    if (!state.result) return;
    const { indirectFactor, utilityFactor, ivaRate, roundingPolicy } = state.factors;

    const id = newItemData.id || genId();
    const quantity = Number(newItemData.quantity) || 0;
    const unitCost = Number(newItemData.unitCost) || 0;
    const total = roundByPolicy(quantity * unitCost, roundingPolicy);
    const code = newItemData.code || `${newItemData.system}-ITEM-${Date.now().toString(36).slice(-4).toUpperCase()}`;

    const newItem: LineItem = {
      ...newItemData,
      id,
      code,
      quantity,
      unitCost,
      total,
      partida: newItemData.partida || "",
    };

    const rawItems = [...state.result.lineItems];
    let lastSysIndex = -1;
    for (let i = rawItems.length - 1; i >= 0; i--) {
      if (rawItems[i].system === newItem.system) {
        lastSysIndex = i;
        break;
      }
    }

    if (lastSysIndex !== -1) {
      rawItems.splice(lastSysIndex + 1, 0, newItem);
    } else {
      rawItems.push(newItem);
    }

    const lineItems = reindexPartidas(rawItems);
    const recalc = recalcFromLineItems(
      lineItems,
      indirectFactor,
      utilityFactor,
      ivaRate,
      roundingPolicy
    );
    set({ result: { ...state.result, lineItems, ...recalc }, isDirty: true });
  },
  removeLineItem: (id) => {
    const state = get();
    if (!state.result) return;
    const { indirectFactor, utilityFactor, ivaRate, roundingPolicy } = state.factors;

    const filtered = state.result.lineItems.filter((it) => it.id !== id);
    const lineItems = reindexPartidas(filtered);
    const recalc = recalcFromLineItems(
      lineItems,
      indirectFactor,
      utilityFactor,
      ivaRate,
      roundingPolicy
    );
    set({ result: { ...state.result, lineItems, ...recalc }, isDirty: true });
  },
  markResultPersisted: () => {
    const state = get();
    set({ savedResult: state.result ? { ...state.result } : null, isDirty: false });
  },
  revertLineItems: () => {
    const state = get();
    if (!state.savedResult) {
      set({ result: null, isDirty: false });
      return;
    }
    set({ result: { ...state.savedResult }, isDirty: false });
  },
  saveEstimateToDb: async () => {
    const state = get();
    const estId = state.activeEstimateId || state.estimateId;
    if (!estId || !state.result) return false;
    try {
      const res = await fetch(`/api/estimates/${estId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineItems: state.result.lineItems,
          subtotalMaterials: state.result.subtotalMaterials,
          subtotalLabor: state.result.subtotalLabor,
          subtotalEngineering: state.result.subtotalEngineering,
          subtotalDirect: state.result.subtotalDirect,
          subtotalIndirects: state.result.subtotalIndirects,
          subtotalUtility: state.result.subtotalUtility,
          grandTotal: state.result.grandTotal,
          iva: state.result.iva,
          totalWithIva: state.result.totalWithIva,
          responsible: state.responsible,
          forceRecalc: false,
          floorplanConfig: JSON.stringify({
            buildingLevels: state.buildingLevels,
            activeFloorplanId: state.activeFloorplanId,
            floorplans: state.floorplans,
          }),
        }),
      });
      if (res.ok) {
        set({ savedResult: { ...state.result }, isDirty: false });
        return true;
      }
      return false;
    } catch (e) {
      console.error("Error saving estimate to DB:", e);
      return false;
    }
  },
  logHistoryEntry: async (changeType: string, details: string) => {
    const state = get();
    const estId = state.activeEstimateId || state.estimateId;
    if (!estId) return;
    try {
      await fetch(`/api/estimates/${estId}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changeType,
          user: state.responsible || "Sistema / Usuario",
          details,
        }),
      });
    } catch (e) {
      console.error("Error logging history entry:", e);
    }
  },
  restoreHistoryVersion: (snapshotRaw: string | Record<string, unknown>) => {
    try {
      let parsed: Record<string, unknown>;
      if (typeof snapshotRaw === "string") {
        if (!snapshotRaw || snapshotRaw === "{}") return false;
        parsed = JSON.parse(snapshotRaw);
      } else {
        parsed = snapshotRaw;
      }

      if (!parsed || !Array.isArray(parsed.lineItems) || parsed.lineItems.length === 0) {
        return false;
      }

      const lineItems = parsed.lineItems as LineItem[];
      const subtotalMaterials = Number(parsed.subtotalMaterials) || 0;
      const subtotalLabor = Number(parsed.subtotalLabor) || 0;
      const subtotalEngineering = Number(parsed.subtotalEngineering) || 0;
      const subtotalDirect = Number(parsed.subtotalDirect) || (subtotalMaterials + subtotalLabor + subtotalEngineering);
      const subtotalIndirects = Number(parsed.subtotalIndirects) || 0;
      const subtotalUtility = Number(parsed.subtotalUtility) || 0;
      const grandTotal = Number(parsed.grandTotal) || (subtotalDirect + subtotalIndirects + subtotalUtility);
      const iva = Number(parsed.iva) || 0;
      const totalWithIva = Number(parsed.totalWithIva) || (grandTotal + iva);

      const restoredResult: CalculationResult = {
        lineItems,
        subtotalMaterials,
        subtotalLabor,
        subtotalEngineering,
        subtotalDirect,
        subtotalIndirects,
        subtotalUtility,
        grandTotal,
        iva,
        totalWithIva,
      };

      set({ result: restoredResult, isDirty: true });
      return true;
    } catch (e) {
      console.error("Error restoring history version:", e);
      return false;
    }
  },
}));
