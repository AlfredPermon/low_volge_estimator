// ─── Types ───────────────────────────────────────────────────────────────────

import { roundByPolicy, type RoundingPolicy } from "./utils"
import { normalizeUnit } from "./unit-normalizer"
import { computeNvrDiskPlan, type RaidType, usableTbFromNominal } from "./cctv-storage"
import {
  computeLaborByCrew,
  DEFAULT_LABOR_RATES,
  type LaborRates,
} from "./labor-calculator"
import { calcularMetrajeCable3DFire, generarBOMFire } from "./fire-engine"

export type SystemName = "CCTV" | "ACCESO" | "VOCEO" | "INCENDIO" | "CANALIZACION" | "CABLEADO" | "GENERAL";

export interface NodePoint {
  id: string;
  system: "cctv" | "access" | "paging" | "fire" | "extinguisher" | "emergency_exit";
  subType?: string;
  x: number;
  y: number;
  idfId?: string;
  verticalDropM?: number;
}

export interface FloorplanRackInput {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface PathwayNodeInput {
  id: string;
  x: number;
  y: number;
}

export interface PathwaySegmentInput {
  id: string;
  fromId: string;
  toId: string;
}

export interface FloorplanConfig {
  id?: string;
  name?: string;
  levelId?: string;
  imageUrl?: string | null;
  scaleMetersPerPx: number;
  racks: FloorplanRackInput[];
  devices: NodePoint[];
  pathwayNodes?: PathwayNodeInput[];
  pathwaySegments?: PathwaySegmentInput[];
  rackRiseM?: number;
  slackM?: number;
}

export function getFloorplansList(rawFloorplanConfig: any): FloorplanConfig[] {
  if (!rawFloorplanConfig) return [];
  if (Array.isArray(rawFloorplanConfig.floorplans) && rawFloorplanConfig.floorplans.length > 0) {
    return rawFloorplanConfig.floorplans;
  }
  if (Array.isArray(rawFloorplanConfig.devices) || rawFloorplanConfig.scaleMetersPerPx !== undefined) {
    return [rawFloorplanConfig];
  }
  return [];
}

import { calculateNodeRoute, Point, Segment } from "./routing-engine"

export interface SpatialCalculationResult {
  cableTotalMeters: number;
  totalConduitMeters: number; // Derivación en Tubería Conduit EMT (3/4")
  totalTrayMeters: number; // Troncal en Escalerilla / Charola tipo malla
  spools305m: number;
  conduitTubes3m: number;
  traySections3m: number;
  boxes4x4Qty: number;
  emtConnectorsQty: number;
  patchPanels48Qty: number;
  patchCordsQty: number;
  nodeDistances: Record<string, number>;
  routes: Record<string, Point[]>;
  warnings: string[];
}

export function calculateRealTrajectories(
  nodes: NodePoint[],
  racks: FloorplanRackInput[],
  scaleMetersPerPx: number,
  rackRiseM: number = 2.5,
  slackM: number = 4.0,
  pathwaySegments: Segment[] = []
): SpatialCalculationResult {
  let cableTotalMeters = 0;
  let totalConduitMeters = 0;
  let totalTrayMeters = 0;
  const warnings: string[] = [];
  const nodeDistances: Record<string, number> = {};
  const routes: Record<string, Point[]> = {};

  if (!nodes || nodes.length === 0) {
    return {
      cableTotalMeters: 0,
      totalConduitMeters: 0,
      totalTrayMeters: 0,
      spools305m: 0,
      conduitTubes3m: 0,
      traySections3m: 0,
      boxes4x4Qty: 0,
      emtConnectorsQty: 0,
      patchPanels48Qty: 0,
      patchCordsQty: 0,
      nodeDistances: {},
      routes: {},
      warnings: [],
    };
  }

  const defaultRack = racks[0] ?? { id: "default_idf", name: "IDF Central", x: 0, y: 0 };
  const starNodes = nodes.filter((n) => n.system !== "fire");
  const fireNodes = nodes.filter((n) => n.system === "fire");

  // 1. Topología Estrella (CCTV, Acceso, Voceo) con Ruteo Troncal
  starNodes.forEach((node) => {
    let targetRack = defaultRack;
    if (node.idfId && racks.length > 0) {
      const matched = racks.find((r) => r.id === node.idfId);
      if (matched) targetRack = matched;
    } else if (racks.length > 1) {
      let minDist = Infinity;
      racks.forEach((r) => {
        const d = Math.abs(node.x - r.x) + Math.abs(node.y - r.y);
        if (d < minDist) {
          minDist = d;
          targetRack = r;
        }
      });
    }

    const defaultDrop =
      node.system === "access" &&
      (node.subType?.toLowerCase().includes("lector") || node.subType?.toLowerCase().includes("botón"))
        ? 1.2
        : 3.0;
    const drop = typeof node.verticalDropM === "number" ? node.verticalDropM : defaultDrop;

    const routeRes = calculateNodeRoute(
      { x: node.x, y: node.y },
      { x: targetRack.x, y: targetRack.y },
      pathwaySegments,
      scaleMetersPerPx,
      drop,
      slackM + rackRiseM
    );

    if (routeRes.totalCableM > 90) {
      warnings.push(
        `⚠️ El dispositivo ${node.id} (${node.subType || node.system.toUpperCase()}) excede el límite de 90m (${routeRes.totalCableM.toFixed(1)}m). Requiere extensor PoE o reubicar hacia un IDF secundario.`
      );
    }

    nodeDistances[node.id] = routeRes.totalCableM;
    routes[node.id] = routeRes.routePoints;
    cableTotalMeters += routeRes.totalCableM;
    totalConduitMeters += routeRes.conduitBranchM;
    totalTrayMeters += routeRes.trayMainM;
  });

  // 2. Topología Lazo Cerrado SLC (Incendio)
  if (fireNodes.length > 0) {
    let targetRack = defaultRack;
    if (fireNodes[0].idfId && racks.length > 0) {
      const matched = racks.find((r) => r.id === fireNodes[0].idfId);
      if (matched) targetRack = matched;
    }

    let prevPoint = { x: targetRack.x, y: targetRack.y };
    fireNodes.forEach((node) => {
      const routeRes = calculateNodeRoute(
        { x: node.x, y: node.y },
        prevPoint,
        pathwaySegments,
        scaleMetersPerPx,
        typeof node.verticalDropM === "number" ? node.verticalDropM : 1.2,
        1.0
      );

      nodeDistances[node.id] = routeRes.totalCableM;
      routes[node.id] = routeRes.routePoints;
      cableTotalMeters += routeRes.totalCableM;
      totalConduitMeters += routeRes.conduitBranchM;
      totalTrayMeters += routeRes.trayMainM;
      prevPoint = { x: node.x, y: node.y };
    });

    const retDx = Math.abs(targetRack.x - prevPoint.x) * scaleMetersPerPx;
    const retDy = Math.abs(targetRack.y - prevPoint.y) * scaleMetersPerPx;
    const returnSeg = (retDx + retDy) * 1.15 + rackRiseM + 2.0;
    cableTotalMeters += returnSeg;
  }

  // 3. Si se dibujaron tramos troncales de pasillo explícitos, calcular la longitud total de charola instalada
  if (pathwaySegments.length > 0) {
    let pathLenPx = 0;
    pathwaySegments.forEach((seg) => {
      pathLenPx += Math.hypot(seg.b.x - seg.a.x, seg.b.y - seg.a.y);
    });
    totalTrayMeters = Math.round(pathLenPx * scaleMetersPerPx * 100) / 100;
  }

  // 4. Conversión a Empaques Comerciales
  const cableWithWaste = cableTotalMeters * 1.08;
  const spools305m = Math.ceil(cableWithWaste / 305);
  const conduitTubes3m = Math.ceil(totalConduitMeters / 3);
  const traySections3m = Math.ceil(totalTrayMeters / 3);
  const boxes4x4Qty = nodes.length;
  const emtConnectorsQty = conduitTubes3m * 2;
  const patchPanels48Qty = starNodes.length > 0 ? Math.ceil(starNodes.length / 48) : 0;
  const patchCordsQty = starNodes.length * 2;

  return {
    cableTotalMeters: Math.round(cableTotalMeters * 100) / 100,
    totalConduitMeters: Math.round(totalConduitMeters * 100) / 100,
    totalTrayMeters: Math.round(totalTrayMeters * 100) / 100,
    spools305m,
    conduitTubes3m,
    traySections3m,
    boxes4x4Qty,
    emtConnectorsQty,
    patchPanels48Qty,
    patchCordsQty,
    nodeDistances,
    routes,
    warnings,
  };
}

export interface CalculationResult {
  systems: Record<string, SystemBreakdown>;
  subtotalMaterials: number;
  subtotalLabor: number;
  subtotalEngineering: number;
  subtotalServices: number;
  subtotalDirect: number;
  subtotalIndirects: number;
  subtotalUtility: number;
  grandTotal: number;
  iva: number;
  totalWithIva: number;
  lineItems: LineItem[];
  warnings?: string[];
  spatialData?: Record<string, SpatialCalculationResult>;
}

export interface CameraEntry {
  type: string;
  model?: string;
  qty: number;
  hasPoE?: boolean;
}

export interface CctvConfig {
  cameras: CameraEntry[];
  nvr: {
    qty: number;
    bays: number;
    recordingDays?: number;
    totalStorageTB?: number;
    raid?: RaidType;
    nvrModel?: string;
    storageTB?: number;
    disksPerBay?: number;
  };
  avgDistanceMeters: number;
  licenses: number;
  /**
   * Puertos fijos adicionales (uplink, NVR, AP, spare, etc.) que deben
   * considerarse al dimensionar switches/patch panels.
   */
  fixedSwitchPorts?: number;
  /** Modo de canalización: ML (detalle) o LOTE (agrupado). */
  conduitMode?: "ML" | "LOTE";

  /**
   * Activa el set detallado de servicios (certificación, as-built,
   * instalación cableado, instalación/config CCTV, misceláneos).
   * Si es false, se mantiene el comportamiento legacy (labor_cctv).
   */
  useDetailedServices?: boolean;
  /** Instalación de cableado: por cámara o por lote. */
  cablingInstallMode?: "POR_CAMARA" | "LOTE";

  // Flags de inclusión para servicios / entregables
  includeCertificationLabeling?: boolean; // por cámara
  includeAsBuilt?: boolean; // 1
  includeCablingInstall?: boolean; // por cámara o lote configurable
  includeCctvInstallConfig?: boolean; // 1
  includeMisc?: boolean; // 1

  // Configuración de estación de trabajo
  workstation?: WorkstationConfig;

  // Campos legacy (backward-compat). No se usan si hay auto-sizing.
  switches?: number;
  ups?: number;
  racks?: number;
  monitors?: number;
  services?: number;
}

/** Configuración de estación de trabajo para operadores de CCTV */
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

export interface AccessConfig {
  doors: number;
  readerType: string;
  readerModelSku?: string;
  controllers: number;
  controllerModelSku?: string;
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
  /** Política de redondeo global (TASK §10, §11.4). Por defecto 2 decimales. */
  roundingPolicy: RoundingPolicy;
  /** Tasa de IVA aplicable al subtotal general (TASK §9.1). Por defecto 16%. */
  ivaRate: number;
  /** Tarifas de mano de obra por hora-hombre (TASK §9.5). */
  laborRates?: LaborRates;
  /** Si es true, la MO se calcula por cuadrilla (TASK §6). */
  useCrewBasedLabor?: boolean;
}

export interface LineItem {
  /** Identificador único interno (TASK §18.2). Generado al construir la partida. */
  id: string;
  partida: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalAmount: number;
  /** Alias de `totalAmount` para compatibilidad con el store y la UI. */
  total?: number;
  system: SystemName;
  category: string;
  isEstimated?: boolean;
  marca?: string;
  modelo?: string;
}

export interface SystemBreakdown {
  materials: number;
  labor: number;
  engineering: number;
  services: number;
  lineItems: LineItem[];
}

export interface CalculationResult {
  systems: Record<string, SystemBreakdown>;
  subtotalMaterials: number;
  subtotalLabor: number;
  subtotalEngineering: number;
  subtotalServices: number;
  subtotalDirect: number;
  subtotalIndirects: number;
  subtotalUtility: number;
  grandTotal: number;
  iva: number;
  totalWithIva: number;
  lineItems: LineItem[];
}

export interface PriceItemRecord {
  id: string;
  sku: string;
  system: string;
  category: string;
  brand: string;
  model: string;
  description: string;
  unit: string;
  unitCost: number;
  performance: number;
  deviceType: string;
  active: boolean;
  // C1 - Campos ampliados (TASK §9.4)
  provider?: string;
  certifications?: string;
  datasheetUrl?: string;
  notes?: string;
  // A2 - Mano de obra por cuadrilla (TASK §9.5)
  crewTechnician?: number;
  crewOfficer?: number;
  crewHelper?: number;
  laborHours?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return roundByPolicy(n, 2)
}

/**
 * Calcula el costo de mano de obra, ya sea por modelo legacy (unitCost × qty)
 * o por modelo de cuadrilla (TASK §6, §9.5) si useCrewBasedLabor=true.
 */
function computeLaborAmount(
  factors: EstimateFactors,
  laborMatch: PriceItemRecord | null,
  fallbackUnitCost: number,
  quantity: number
): { total: number; crewSummary: string; isCrewBased: boolean } {
  if (factors.useCrewBasedLabor && laborMatch) {
    const result = computeLaborByCrew({
      quantity,
      crew: {
        technicians: laborMatch.crewTechnician ?? 0,
        officers: laborMatch.crewOfficer ?? 0,
        helpers: laborMatch.crewHelper ?? 0,
        laborHours: laborMatch.laborHours ?? 0,
      },
      rates: factors.laborRates ?? DEFAULT_LABOR_RATES,
      policy: factors.roundingPolicy,
    });
    return {
      total: result.totalLabor,
      crewSummary: result.crewSummary,
      isCrewBased: true,
    };
  }
  // Modelo legacy: unitCost × qty
  const unitCost = laborMatch?.unitCost ?? fallbackUnitCost;
  return {
    total: round2(unitCost * quantity),
    crewSummary: "—",
    isCrewBased: false,
  };
}

function matchPriceItemBySku(
  items: PriceItemRecord[],
  sku: string
): PriceItemRecord | null {
  const needle = String(sku || "").trim().toLowerCase();
  if (!needle) return null;
  return (
    items.find((item) => String(item.sku || "").trim().toLowerCase() === needle) ??
    null
  );
}

function matchPriceItemBySkuOrModel(
  items: PriceItemRecord[],
  codeOrModel: string,
  opts?: { system?: string; deviceType?: string }
): PriceItemRecord | null {
  const needle = String(codeOrModel || "").trim().toLowerCase();
  if (!needle) return null;

  const skuMatch =
    items.find((it) => String(it.sku || "").trim().toLowerCase() === needle) ??
    null;
  if (skuMatch) return skuMatch;

  const sysNeedle = String(opts?.system || "").trim().toLowerCase();
  const devNeedle = String(opts?.deviceType || "").trim().toLowerCase();

  let candidates = items.filter((it) => {
    return String(it.model || "").trim().toLowerCase() === needle;
  });
  if (sysNeedle) {
    candidates = candidates.filter(
      (it) => String(it.system || "").trim().toLowerCase() === sysNeedle
    );
  }
  if (devNeedle) {
    candidates = candidates.filter(
      (it) => String(it.deviceType || "").trim().toLowerCase() === devNeedle
    );
  }
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  candidates.sort((a, b) => (Number(b.unitCost) || 0) - (Number(a.unitCost) || 0));
  return candidates[0] ?? null;
}

function matchPriceItem(
  items: PriceItemRecord[],
  system: string,
  deviceType: string
): PriceItemRecord | null {
  return (
    items.find((item) => {
      return item.system === system && item.deviceType === deviceType;
    }) ?? null
  );
}

function makeLineItem(
  idx: number,
  systemPrefix: string,
  system: SystemName,
  code: string,
  description: string,
  unit: string,
  quantity: number,
  unitCost: number,
  category: string = "Equipo",
  isEstimated = false,
  marca: string = "",
  modelo: string = ""
): LineItem {
  const q = round2(quantity);
  const c = round2(unitCost);
  return {
    id: `li_${Date.now().toString(36)}_${idx}_${Math.random().toString(36).slice(2, 8)}`,
    partida: `${systemPrefix}.${String(idx).padStart(2, "0")}`,
    code,
    description,
    // Normalización de unidades (TASK §11.3)
    unit: normalizeUnit(unit),
    quantity: q,
    unitCost: c,
    totalAmount: round2(q * c),
    system,
    category,
    isEstimated,
    marca,
    modelo
  };
}

function sumLineItems(items: LineItem[]): { materials: number; labor: number; engineering: number; services: number } {
  let materials = 0;
  let labor = 0;
  let engineering = 0;
  let services = 0;
  for (const item of items) {
    const amt = item.totalAmount;
    if (item.category === "Mano de Obra") labor += amt;
    else if (item.category === "Servicio") services += amt;
    else if (item.category === "Ingeniería") engineering += amt;
    else materials += amt;
  }
  return { materials: round2(materials), labor: round2(labor), engineering: round2(engineering), services: round2(services) };
}

// ─── System Calculators ──────────────────────────────────────────────────────

export function extractProjectSpatialResults(
  rawFloorplanConfig: any,
  rackRiseMDefault: number = 2.5,
  slackMDefault: number = 4.0
): SpatialCalculationResult {
  const fps = getFloorplansList(rawFloorplanConfig);

  let cableTotalMeters = 0;
  let totalConduitMeters = 0;
  let totalTrayMeters = 0;
  const warnings: string[] = [];
  const nodeDistances: Record<string, number> = {};
  const routes: Record<string, Point[]> = {};

  for (const fp of fps) {
    if (!fp.devices || fp.devices.length === 0) continue;

    const pathwaySegmentsList: Segment[] = [];
    if (fp.pathwayNodes && fp.pathwaySegments) {
      const nodeMap = new Map((fp.pathwayNodes as any[]).map((n) => [n.id, n]));
      (fp.pathwaySegments as any[]).forEach((seg) => {
        const from = nodeMap.get(seg.fromId);
        const to = nodeMap.get(seg.toId);
        if (from && to) {
          pathwaySegmentsList.push({ a: { x: from.x, y: from.y }, b: { x: to.x, y: to.y } });
        }
      });
    }

    const res = calculateRealTrajectories(
      fp.devices,
      fp.racks || [],
      fp.scaleMetersPerPx || 0.05,
      fp.rackRiseM ?? rackRiseMDefault,
      fp.slackM ?? slackMDefault,
      pathwaySegmentsList
    );

    cableTotalMeters += res.cableTotalMeters;
    totalConduitMeters += res.totalConduitMeters;
    totalTrayMeters += res.totalTrayMeters;
    const prefix = (fp as any).name ? `[${(fp as any).name}] ` : "";
    res.warnings.forEach((w) => warnings.push(`${prefix}${w}`));
    Object.assign(nodeDistances, res.nodeDistances);
    Object.assign(routes, res.routes);
  }

  const cableWithWaste = cableTotalMeters * 1.08;
  const spools305m = Math.ceil(cableWithWaste / 305);
  const conduitTubes3m = Math.ceil(totalConduitMeters / 3);
  const traySections3m = Math.ceil(totalTrayMeters / 3);
  const boxes4x4Qty = Object.keys(nodeDistances).length;
  const emtConnectorsQty = conduitTubes3m * 2;
  const starNodeCount = Object.keys(nodeDistances).length;
  const patchPanels48Qty = starNodeCount > 0 ? Math.ceil(starNodeCount / 48) : 0;
  const patchCordsQty = starNodeCount * 2;

  return {
    cableTotalMeters: Math.round(cableTotalMeters * 100) / 100,
    totalConduitMeters: Math.round(totalConduitMeters * 100) / 100,
    totalTrayMeters: Math.round(totalTrayMeters * 100) / 100,
    spools305m,
    conduitTubes3m,
    traySections3m,
    boxes4x4Qty,
    emtConnectorsQty,
    patchPanels48Qty,
    patchCordsQty,
    nodeDistances,
    routes,
    warnings,
  };
}

export function calculateCCTV(
  config: CctvConfig,
  factors: EstimateFactors,
  priceItems: PriceItemRecord[],
  floorplanConfig?: FloorplanConfig
): SystemBreakdown {
  const items: LineItem[] = [];
  let idx = 1;

  const systemPrefix = "5.7.3";
  const cameras = Array.isArray(config.cameras) ? config.cameras : [];

  const nvrQty = Number(config.nvr?.qty) || 0;
  // Total camera count
  const totalCameras = cameras.reduce((sum, c) => sum + (Number(c?.qty) || 0), 0);
  const hasAnyCctv = totalCameras > 0 || nvrQty > 0;

  const fixedPorts = Math.max(0, Number(config.fixedSwitchPorts ?? 4));
  const portsWithHeadroom = hasAnyCctv ? Math.ceil(totalCameras * 1.2) + fixedPorts : 0;

  // Switch sizing (48/24) minimizando cantidad de switches.
  let sw48 = 0;
  let sw24 = 0;
  if (portsWithHeadroom > 0) {
    sw48 = Math.floor(portsWithHeadroom / 48);
    let rem = portsWithHeadroom % 48;
    if (rem > 0) {
      if (rem <= 24) sw24 = 1;
      else sw48 += 1;
    }
  }

  // Patch panels deben dimensionarse al mismo criterio que switches (incluye headroom + puertos fijos)
  const patchPanelPorts = portsWithHeadroom;
  const patchPanels48 = patchPanelPorts > 0 ? Math.ceil(patchPanelPorts / 48) : 0;
  const patchCords = totalCameras * 2;
  const velcroRolls = totalCameras > 0 ? Math.ceil(totalCameras / 15) : 0;

  const rackQty = hasAnyCctv ? 1 : 0;
  const upsQty = hasAnyCctv ? 1 : 0;
  const pduQty = hasAnyCctv ? 1 : 0;
  const monitorQty = hasAnyCctv && !config.workstation ? 1 : 0;

  // Cálculo espacial si existen nodos en el plano
  const fps = getFloorplansList(floorplanConfig);
  const hasCctvSpatial = fps.some((fp) => fp.devices && fp.devices.some((d) => d.system === "cctv"));
  const spatialResult = hasCctvSpatial
    ? extractProjectSpatialResults(floorplanConfig, factors.verticalDrop ?? 2.5, factors.rackAllowance ?? 4.0)
    : null;

  // Cable calculation for cameras
  const cableLengthMeters = spatialResult
    ? spatialResult.cableTotalMeters
    : round2(
        (config.avgDistanceMeters + factors.verticalDrop + factors.rackAllowance) *
          totalCameras *
          (1 + factors.wasteFactorCable)
      );

  // Conduit calculation for cameras
  const conduitLengthMeters = spatialResult
    ? spatialResult.totalConduitMeters
    : round2(
        (config.avgDistanceMeters + factors.verticalDrop + factors.rackAllowance) *
          totalCameras *
          (1 + factors.wasteFactorConduit)
      );

  function addSkuItem(params: {
    sku: string;
    fallbackDescription: string;
    fallbackUnit: string;
    quantity: number;
    category: string;
    deviceTypeHint?: string;
  }) {
    if (params.quantity <= 0) return;
    const matched = matchPriceItemBySkuOrModel(priceItems, params.sku, {
      system: "CCTV",
      deviceType: params.deviceTypeHint,
    });
    items.push(
      makeLineItem(
        idx++,
        systemPrefix,
        "CCTV",
        params.sku,
        matched?.description ?? params.fallbackDescription,
        matched?.unit ?? params.fallbackUnit,
        params.quantity,
        matched?.unitCost ?? getEstimatedCost(params.sku),
        matched?.category ?? params.category,
        !matched,
        matched?.brand || "",
        matched?.model || ""
      )
    );
  }

  // --- Cameras ---
  for (const cam of cameras) {
    const typeLower = cam.type.toLowerCase();
    let devType = "cctv_camera_bullet";
    if (typeLower.includes("domo") || typeLower.includes("dome")) devType = "cctv_camera_domo";
    else if (typeLower.includes("ptz")) devType = "cctv_camera_ptz";
    else if (typeLower.includes("fisheye")) devType = "cctv_camera_fisheye";
    else if (typeLower.includes("panoramic") || typeLower.includes("panorámica")) devType = "cctv_camera_panoramic";

    // Si hay un modelo (SKU) seleccionado, usar ese precio directamente
    let matched: PriceItemRecord | null = null;
    let unitCost: number;
    let description: string;

    if (cam.model && cam.model.trim() !== "") {
      matched = matchPriceItemBySkuOrModel(priceItems, cam.model, {
        system: "CCTV",
        deviceType: devType,
      });
      if (matched) {
        unitCost = matched.unitCost;
        description = matched.description;
      } else {
        // SKU no encontrado, caer back al deviceType
        matched = matchPriceItem(priceItems, "CCTV", devType);
        unitCost = matched?.unitCost ?? getEstimatedCost(devType);
        description = `Cámara IP ${cam.type} ${cam.hasPoE ? "PoE" : ""} exterior 5MP`;
      }
    } else {
      matched = matchPriceItem(priceItems, "CCTV", devType);
      unitCost = matched?.unitCost ?? getEstimatedCost(devType);
      description = `Cámara IP ${cam.type} ${cam.hasPoE ? "PoE" : ""} exterior 5MP`;
    }

    items.push(
      (() => {
        const code = `CCTV-CAM-${String(idx).padStart(3, "0")}`;
        const li = makeLineItem(
          idx,
          systemPrefix,
          "CCTV",
          code,
          description,
          "pza",
          cam.qty,
          unitCost,
          "Equipo",
          !matched,
          matched?.brand || "",
          matched?.model || ""
        );
        idx += 1;
        return li;
      })()
    );
  }

  // --- NVR ---
  let nvrMatch: PriceItemRecord | null = null;
  let nvrCost: number;
  let nvrDescription: string;

  if (config.nvr.nvrModel && config.nvr.nvrModel.trim() !== "") {
    nvrMatch = matchPriceItemBySkuOrModel(priceItems, config.nvr.nvrModel, {
      system: "CCTV",
      deviceType: "cctv_nvr",
    });
    if (nvrMatch) {
      nvrCost = nvrMatch.unitCost;
      nvrDescription = nvrMatch.description;
    } else {
      nvrCost = getEstimatedCost("cctv_nvr");
      nvrDescription = `NVR ${config.nvr.bays} bahías`;
    }
  } else {
    nvrMatch = matchPriceItem(priceItems, "CCTV", "cctv_nvr");
    nvrCost = nvrMatch?.unitCost ?? getEstimatedCost("cctv_nvr");
    nvrDescription = `NVR ${config.nvr.bays} bahías`;
  }

  items.push(
    makeLineItem(idx++, systemPrefix, "CCTV", "CCTV-NVR-001", nvrDescription, "pza", nvrQty, nvrCost, "Equipo", !nvrMatch, nvrMatch?.brand || "", nvrMatch?.model || "")
  );

  const ws = config.workstation;
  if (ws) {
    const camCount = Math.max(0, Number(ws.cameraCount) || 0) || totalCameras;
    const manualStations = Math.max(0, Number(ws.desiredStations) || 0);

    const recommendedStations = (() => {
      if (camCount <= 0) return 0;
      if (camCount <= 16) return 1;
      if (camCount <= 64) return camCount <= 40 ? 1 : 2;
      if (camCount <= 128) {
        if (camCount <= 86) return 2;
        if (camCount <= 108) return 3;
        return 4;
      }
      if (camCount <= 256) {
        if (camCount <= 171) return 4;
        if (camCount <= 214) return 5;
        return 6;
      }
      return Math.ceil(camCount / 64);
    })();

    const stations = Math.max(manualStations, recommendedStations);

    const screen43Qty = Math.max(0, Number(ws.screen43Qty) || 0);
    const screen55Qty = Math.max(0, Number(ws.screen55Qty) || 0);
    const wallMountQty = screen43Qty + screen55Qty;

    const monitorArmQty = Math.max(0, Number(ws.monitorArmQty) || 0);
    const workstationPCQty = Math.max(0, Number(ws.workstationPCQty) || 0);

    const monitors27Qty = stations > 0 ? stations * 2 : 0;
    const autoArmQty = stations > 0 ? stations : 0;
    const autoPcQty = stations > 0 ? stations : 0;

    addSkuItem({
      sku: "CCTV-NVR-029",
      fallbackDescription: "Monitor 27\" UHD 4K para estación CCTV",
      fallbackUnit: "PZA",
      quantity: monitors27Qty,
      category: "Equipo",
      deviceTypeHint: "cctv_workstation_monitor_27",
    });

    addSkuItem({
      sku: "CCTV-NVR-012",
      fallbackDescription: "Base de escritorio articulada para 2 monitores (27-34\")",
      fallbackUnit: "PZA",
      quantity: monitorArmQty > 0 ? monitorArmQty : autoArmQty,
      category: "Accesorio",
      deviceTypeHint: "cctv_workstation_monitor_arm",
    });

    addSkuItem({
      sku: "CCTV-NVR-024",
      fallbackDescription: "Computadora alto rendimiento para estación de monitoreo CCTV",
      fallbackUnit: "PZA",
      quantity: workstationPCQty > 0 ? workstationPCQty : autoPcQty,
      category: "Equipo",
      deviceTypeHint: "cctv_workstation_pc",
    });

    addSkuItem({
      sku: "CCTV-NVR-015",
      fallbackDescription: "Pantalla profesional 43\" UHD 4K para video wall / monitoreo",
      fallbackUnit: "PZA",
      quantity: screen43Qty,
      category: "Equipo",
      deviceTypeHint: "cctv_workstation_screen_43",
    });

    addSkuItem({
      sku: "CCTV-NVR-016",
      fallbackDescription: "Pantalla profesional 55\" UHD 4K para video wall / monitoreo",
      fallbackUnit: "PZA",
      quantity: screen55Qty,
      category: "Equipo",
      deviceTypeHint: "cctv_workstation_screen_55",
    });

    addSkuItem({
      sku: "CCTV-NVR-013",
      fallbackDescription: "Montaje de pared fijo universal para monitor (32 a 60\")",
      fallbackUnit: "PZA",
      quantity: wallMountQty,
      category: "Accesorio",
      deviceTypeHint: "cctv_workstation_wall_mount",
    });
  }

  // ─── Auto-dimension BOM (Switching / Rack / Patch panels / Accesorios) ───

  // Switches PoE (USW-PRO-48-POE / USW-PRO-24-POE)
  addSkuItem({
    sku: "USW-PRO-48-POE",
    fallbackDescription: "Switch PoE 48 puertos (auto-dimensionado)",
    fallbackUnit: "PZA",
    quantity: sw48,
    category: "Equipo",
    deviceTypeHint: "network_switch",
  });
  addSkuItem({
    sku: "USW-PRO-24-POE",
    fallbackDescription: "Switch PoE 24 puertos (auto-dimensionado)",
    fallbackUnit: "PZA",
    quantity: sw24,
    category: "Equipo",
    deviceTypeHint: "network_switch",
  });

  // Rack / UPS / PDU / Monitor (1 si hay NVR/cámaras)
  addSkuItem({
    sku: "Rack-2P-45U",
    fallbackDescription: "Rack 2 postes 45U (auto)",
    fallbackUnit: "PZA",
    quantity: rackQty,
    category: "Equipo",
  });
  addSkuItem({
    sku: "UPS-2000VA",
    fallbackDescription: "UPS 2000VA (auto)",
    fallbackUnit: "PZA",
    quantity: upsQty,
    category: "Equipo",
  });
  addSkuItem({
    sku: "PDU-15A",
    fallbackDescription: "PDU 15A para rack (auto)",
    fallbackUnit: "PZA",
    quantity: pduQty,
    category: "Accesorio",
  });
  addSkuItem({
    sku: "Samsung-QBC-55",
    fallbackDescription: "Monitor profesional 55\" para CCTV (auto)",
    fallbackUnit: "PZA",
    quantity: monitorQty,
    category: "Equipo",
  });

  // Patch Panels + Organización de rack
  addSkuItem({
    sku: "PATCH-PANEL-48",
    fallbackDescription: "Patch Panel 48 puertos Cat6",
    fallbackUnit: "PZA",
    quantity: patchPanels48,
    category: "Equipo",
  });
  addSkuItem({
    sku: "WMP1E",
    fallbackDescription: "Organizador horizontal 1U (1 por patch panel)",
    fallbackUnit: "PZA",
    quantity: patchPanels48,
    category: "Accesorio",
  });
  addSkuItem({
    sku: "WMPV45E",
    fallbackDescription: "Organizador vertical 45U (2 si hay rack)",
    fallbackUnit: "PZA",
    quantity: rackQty > 0 ? 2 : 0,
    category: "Accesorio",
  });

  // Patch cords / jacks / faceplates / insertos
  addSkuItem({
    sku: "PATCH-CORD-7",
    fallbackDescription: "Patch cord Cat6 7ft (≈2.1m)",
    fallbackUnit: "PZA",
    quantity: patchCords,
    category: "Accesorio",
  });
  addSkuItem({
    sku: "CJ688TGIW",
    fallbackDescription: "Jack Cat6 (1 por cámara)",
    fallbackUnit: "PZA",
    quantity: totalCameras,
    category: "Accesorio",
  });
  addSkuItem({
    sku: "CFPE21WY",
    fallbackDescription: "Faceplate (1 por cámara)",
    fallbackUnit: "PZA",
    quantity: totalCameras,
    category: "Accesorio",
  });
  addSkuItem({
    sku: "CMB1W-X",
    fallbackDescription: "Inserto / base (1 por cámara)",
    fallbackUnit: "PZA",
    quantity: totalCameras,
    category: "Accesorio",
  });

  // Velcro (1 por 15 cámaras)
  addSkuItem({
    sku: "VELCRO-ROLL",
    fallbackDescription: "Rollo de velcro para administración de cableado (1 por 15 cámaras)",
    fallbackUnit: "ROLLO",
    quantity: velcroRolls,
    category: "Consumible",
  });

  // --- Storage Disks ---
  const maxDisks = nvrQty * config.nvr.bays;
  const raid: RaidType = (config.nvr.raid ?? "NONE") as RaidType;
  const legacyTotalDisks = nvrQty * config.nvr.bays * (Number(config.nvr.disksPerBay) || 0);
  const legacyNominalDiskTB = Number(config.nvr.storageTB) || 0;
  const legacyTotalUsableTB =
    legacyTotalDisks > 0 && legacyNominalDiskTB > 0
      ? usableTbFromNominal(legacyNominalDiskTB) * legacyTotalDisks
      : 0;
  const requiredUsableTB =
    Number(config.nvr.totalStorageTB) > 0 ? Number(config.nvr.totalStorageTB) : legacyTotalUsableTB;

  const plan = computeNvrDiskPlan({ requiredUsableTB, maxDisks, raid });

  if (plan.ok && plan.diskCount > 0 && plan.diskNominalTB > 0) {
    const tbNeedle = `${plan.diskNominalTB}TB`.toLowerCase();
    const diskMatch =
      priceItems.find((it) => {
        if (it.system !== "CCTV" || it.deviceType !== "cctv_disk") return false;
        const hay = `${it.sku} ${it.model} ${it.description}`.toLowerCase();
        return hay.includes(tbNeedle);
      }) ?? matchPriceItem(priceItems, "CCTV", "cctv_disk");
    const diskCost = diskMatch?.unitCost ?? getEstimatedCost("cctv_disk");
    items.push(
      makeLineItem(
        idx++,
        systemPrefix,
        "CCTV",
        "CCTV-DISK-001",
        `Disco duro ${plan.diskNominalTB}TB para NVR (${raid})`,
        "pza",
        plan.diskCount,
        diskCost,
        "Equipo",
        !diskMatch,
        diskMatch?.brand || "",
        diskMatch?.model || ""
      )
    );
  }

  // --- Licenses ---
  if (config.licenses > 0) {
    const licMatch = matchPriceItem(priceItems, "CCTV", "cctv_license");
    const licCost = licMatch?.unitCost ?? getEstimatedCost("cctv_license");
    items.push(
      makeLineItem(idx++, systemPrefix, "CCTV", "CCTV-LIC-001", "Licencia de cámara IP adicional", "pza", config.licenses, licCost, "Equipo", !licMatch, licMatch?.brand || "", licMatch?.model || "")
    );
  }

  // --- Cable UTP ---
  // Se compra por bobina/rollo (305m).
  const COIL_LENGTH_M = 305;
  const cableSkuMatch = matchPriceItemBySku(priceItems, "PUR6004BU-FE");
  const cableFallbackMatch = matchPriceItem(priceItems, "CABLEADO", "cable_utp");
  const cableMatch = cableSkuMatch ?? cableFallbackMatch;
  const cableUnitCanonical = normalizeUnit(cableMatch?.unit ?? "ML");
  // Si el SKU existe y viene en ML, se convierte a costo por bobina.
  // Si no existe el SKU, se usa un costo estimado por ML y se convierte a bobina.
  const cableUnitCost = cableMatch?.unitCost ?? getEstimatedCost("PUR6004BU-FE");
  const cableCostPerCoil = round2(
    cableUnitCanonical === "ML" ? cableUnitCost * COIL_LENGTH_M : cableUnitCost
  );
  const cableCoils = spatialResult ? spatialResult.spools305m : Math.ceil(cableLengthMeters / COIL_LENGTH_M);
  items.push(
    makeLineItem(
      idx++,
      systemPrefix,
      "CCTV",
      "PUR6004BU-FE",
      (cableMatch?.description ?? "Cable UTP Cat6 para CCTV (bobina 305m)"),
      "rollo",
      cableCoils,
      cableCostPerCoil,
      "Equipo",
      !cableSkuMatch,
      cableMatch?.brand || "",
      cableMatch?.model || ""
    )
  );

  // --- Canalización (ML o LOTE) ---
  const conduitMode = config.conduitMode ?? "LOTE";
  const conduitMatch = matchPriceItem(priceItems, "CANALIZACION", "conduit");
  const codoMatch = matchPriceItem(priceItems, "CANALIZACION", "codo");
  const copleMatch = matchPriceItem(priceItems, "CANALIZACION", "cople");
  const fittingCount = Math.ceil(conduitLengthMeters / 3);

  if (conduitMode === "ML") {
    const conduitCost = conduitMatch?.unitCost ?? getEstimatedCost("conduit");
    items.push(
      makeLineItem(
        idx++,
        systemPrefix,
        "CCTV",
        conduitMatch?.sku ?? "CONDUIT-ML",
        conduitMatch?.description ?? `Conduit 3/4" para CCTV`,
        conduitMatch?.unit ?? "ML",
        conduitLengthMeters,
        conduitCost,
        "Equipo",
        !conduitMatch,
        conduitMatch?.brand || "",
        conduitMatch?.model || ""
      )
    );

    if (fittingCount > 0) {
      const codoCost = codoMatch?.unitCost ?? getEstimatedCost("codo");
      items.push(
        makeLineItem(
          idx++,
          systemPrefix,
          "CCTV",
          codoMatch?.sku ?? "CODO-3/4",
          codoMatch?.description ?? `Codo conduit 3/4" 90°`,
          codoMatch?.unit ?? "PZA",
          fittingCount,
          codoCost,
          "Accesorio",
          !codoMatch,
          codoMatch?.brand || "",
          codoMatch?.model || ""
        )
      );
      const copleCost = copleMatch?.unitCost ?? getEstimatedCost("cople");
      items.push(
        makeLineItem(
          idx++,
          systemPrefix,
          "CCTV",
          copleMatch?.sku ?? "COPLE-3/4",
          copleMatch?.description ?? `Cople conduit 3/4"`,
          copleMatch?.unit ?? "PZA",
          fittingCount,
          copleCost,
          "Accesorio",
          !copleMatch,
          copleMatch?.brand || "",
          copleMatch?.model || ""
        )
      );
    }
  } else {
    // LOTE: preferir SKU CAN-LOT si existe, si no calcular a partir de ML + accesorios.
    const lotMatch = matchPriceItemBySku(priceItems, "CAN-LOT");
    if (lotMatch) {
      items.push(
        makeLineItem(
          idx++,
          systemPrefix,
          "CCTV",
          "CAN-LOT",
          lotMatch.description,
          lotMatch.unit ?? "LOTE",
          hasAnyCctv ? 1 : 0,
          lotMatch.unitCost,
          "Equipo",
          false,
          lotMatch.brand || "",
          lotMatch.model || ""
        )
      );
    } else {
      const conduitUnitCanonical = normalizeUnit(conduitMatch?.unit ?? "ML");
      const conduitUnitCost = conduitMatch?.unitCost ?? getEstimatedCost("conduit");
      const conduitBundleBase =
        conduitUnitCanonical === "ML" ? conduitUnitCost * conduitLengthMeters : conduitUnitCost;
      const codoCost = codoMatch?.unitCost ?? getEstimatedCost("codo");
      const copleCost = copleMatch?.unitCost ?? getEstimatedCost("cople");
      const conduitBundleTotal = round2(
        conduitBundleBase + fittingCount * codoCost + fittingCount * copleCost
      );
      const conduitBundleEstimated = !conduitMatch || !codoMatch || !copleMatch;
      items.push(
        makeLineItem(
          idx++,
          systemPrefix,
          "CCTV",
          "CAN-LOT",
          `Canalización (LOTE) para CCTV (${round2(conduitLengthMeters)} ml)`,
          "lote",
          hasAnyCctv ? 1 : 0,
          conduitBundleTotal,
          "Equipo",
          conduitBundleEstimated
        )
      );
    }
  }

  // --- Servicios / Entregables (detallados) ---
  const useDetailed = config.useDetailedServices ?? true;
  if (useDetailed) {
    const includeCert = config.includeCertificationLabeling ?? true;
    const includeAsBuilt = config.includeAsBuilt ?? true;
    const includeCabInst = config.includeCablingInstall ?? true;
    const includeCctvInst = config.includeCctvInstallConfig ?? true;
    const includeMisc = config.includeMisc ?? true;
    const cabMode = config.cablingInstallMode ?? "POR_CAMARA";

    if (includeCert && totalCameras > 0) {
      addSkuItem({
        sku: "SRV-CERT-TEST",
        fallbackDescription: "Certificación / pruebas de punto (por cámara)",
        fallbackUnit: "PZA",
        quantity: totalCameras,
        category: "Servicio",
      });
      addSkuItem({
        sku: "SRV-LABEL",
        fallbackDescription: "Etiquetado de punto (por cámara)",
        fallbackUnit: "PZA",
        quantity: totalCameras,
        category: "Servicio",
      });
    }
    if (includeAsBuilt && hasAnyCctv) {
      addSkuItem({
        sku: "SRV-PLN",
        fallbackDescription: "As-built / planos y entregables",
        fallbackUnit: "SERV",
        quantity: 1,
        category: "Ingeniería",
      });
    }
    if (includeCabInst && hasAnyCctv) {
      const qty = cabMode === "LOTE" ? 1 : totalCameras;
      addSkuItem({
        sku: "SRV-INST-CAB",
        fallbackDescription: cabMode === "LOTE"
          ? "Instalación de cableado (lote)"
          : "Instalación de cableado (por cámara)",
        fallbackUnit: cabMode === "LOTE" ? "LOTE" : "PZA",
        quantity: qty,
        category: "Mano de Obra",
      });
    }
    if (includeCctvInst && hasAnyCctv) {
      addSkuItem({
        sku: "SRV-INST-CCTV",
        fallbackDescription: "Instalación / configuración de CCTV (lote)",
        fallbackUnit: "LOTE",
        quantity: 1,
        category: "Mano de Obra",
      });
    }
    if (includeMisc && hasAnyCctv) {
      addSkuItem({
        sku: "MISC-LOT",
        fallbackDescription: "Misceláneos (consumibles, tornillería, etc.)",
        fallbackUnit: "LOTE",
        quantity: 1,
        category: "Consumible",
      });
    }
  }

  // --- Labor ---
  // Modelo legacy de mano de obra (solo si NO se usan servicios detallados)
  if (!(config.useDetailedServices ?? true)) {
    const laborMatch = matchPriceItem(priceItems, "CCTV", "labor_cctv");
    const labor = computeLaborAmount(
      factors,
      laborMatch,
      getEstimatedCost("labor_cctv"),
      totalCameras
    );
    const laborDesc = labor.isCrewBased
      ? `Instalación de sistema CCTV (mano de obra) [${labor.crewSummary}]`
      : "Instalación de sistema CCTV (mano de obra)";
    items.push(
      makeLineItem(idx++, systemPrefix, "CCTV", "CCTV-MO-001", laborDesc, "lote", 1, labor.total, "Mano de Obra", !laborMatch, laborMatch?.brand || "", laborMatch?.model || "")
    );
  }

  const sums = sumLineItems(items);
  return { ...sums, lineItems: items };
}

export function calculateAccess(
  config: AccessConfig,
  factors: EstimateFactors,
  priceItems: PriceItemRecord[],
  floorplanConfig?: FloorplanConfig
): SystemBreakdown {
  const items: LineItem[] = [];
  let idx = 1;

  const totalDevices = config.doors + config.controllers + config.turnstiles + config.magneticLocks + config.exitButtons + config.touchlessButtons;

  const accessNodes = floorplanConfig?.devices?.filter((d) => d.system === "access") ?? [];
  const spatialResult =
    accessNodes.length > 0
      ? calculateRealTrajectories(
          accessNodes,
          floorplanConfig?.racks ?? [],
          floorplanConfig?.scaleMetersPerPx ?? 0.05,
          floorplanConfig?.rackRiseM ?? factors.verticalDrop ?? 2.5,
          floorplanConfig?.slackM ?? factors.rackAllowance ?? 4.0
        )
      : null;

  // Cable
  const cableLength = spatialResult
    ? spatialResult.cableTotalMeters
    : round2(
        (config.avgDistanceMeters + factors.verticalDrop + factors.rackAllowance) *
          totalDevices *
          (1 + factors.wasteFactorCable)
      );

  // Conduit
  const conduitLength = spatialResult
    ? spatialResult.totalConduitMeters
    : round2(config.avgDistanceMeters * totalDevices * (1 + factors.wasteFactorConduit));

  // --- Readers / Terminals ---
  const scorePick = (
    candidates: PriceItemRecord[],
    prefer: string[],
    reject: string[]
  ): PriceItemRecord | null => {
    if (candidates.length === 0) return null;
    const scored = candidates.map((c) => {
      const hay = `${c.sku} ${c.brand} ${c.model} ${c.description}`.toLowerCase();
      let score = 0;
      for (const p of prefer) if (hay.includes(p)) score += 2;
      for (const r of reject) if (hay.includes(r)) score -= 4;
      return { c, score };
    });
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const bu = Number(b.c.unitCost) || 0;
      const au = Number(a.c.unitCost) || 0;
      return bu - au;
    });
    return scored[0]?.c ?? null;
  };

  const readerSku = String(config.readerModelSku ?? "").trim();
  const prefersSenseface =
    String(config.readerType || "")
      .toLowerCase()
      .includes("biometr");
  const readerMatch =
    (readerSku ? matchPriceItemBySku(priceItems, readerSku) : null) ??
    (prefersSenseface ? matchPriceItemBySkuOrModel(priceItems, "SENSEFACE 7A") : null) ??
    scorePick(
      priceItems.filter(
        (it) => it.system === "ACCESO" && it.deviceType === "access_reader"
      ),
      ["senseface", "terminal", "lect", "biometr", "rfid", "tarjeta", "facial", "reconocimiento"],
      ["soporte", "base", "bracket", "montaje", "holder"]
    ) ??
    matchPriceItem(priceItems, "ACCESO", "access_reader");

  const readerCost = readerMatch?.unitCost ?? getEstimatedCost("access_reader");
  items.push(
    makeLineItem(
      idx++,
      "5.7.4",
      "ACCESO",
      readerMatch?.sku || "ACC-TER-001",
      readerMatch?.description || `Terminal de acceso ${config.readerType}`,
      readerMatch?.unit || "pza",
      config.doors,
      readerCost,
      "Equipo",
      !readerMatch,
      readerMatch?.brand || "",
      readerMatch?.model || ""
    )
  );

  // --- Controllers ---
  const controllerSku = String(config.controllerModelSku ?? "").trim();
  const ctrlMatch =
    (controllerSku ? matchPriceItemBySku(priceItems, controllerSku) : null) ??
    scorePick(
      priceItems.filter(
        (it) => it.system === "ACCESO" && it.deviceType === "access_controller"
      ),
      ["controlador", "controller", "puerta", "panel", "access"],
      ["cámara", "camera", "captura", "documento", "visitante", "visitor"]
    ) ??
    matchPriceItem(priceItems, "ACCESO", "access_controller");

  const ctrlCost = ctrlMatch?.unitCost ?? getEstimatedCost("access_controller");
  items.push(
    makeLineItem(
      idx++,
      "5.7.4",
      "ACCESO",
      ctrlMatch?.sku || "ACC-CTR-001",
      ctrlMatch?.description || "Controlador de acceso de 2 puertas",
      ctrlMatch?.unit || "pza",
      config.controllers,
      ctrlCost,
      "Equipo",
      !ctrlMatch,
      ctrlMatch?.brand || "",
      ctrlMatch?.model || ""
    )
  );

  // --- Turnstiles ---
  if (config.turnstiles > 0) {
    const tsMatch = matchPriceItem(priceItems, "ACCESO", "access_turnstile");
    const tsCost = tsMatch?.unitCost ?? getEstimatedCost("access_turnstile");
    items.push(
      makeLineItem(idx++, "5.7.4", "ACCESO", "ACC-TSR-001", "Torniquete de acceso", "pza", config.turnstiles, tsCost, "Equipo", !tsMatch, tsMatch?.brand || "", tsMatch?.model || "")
    );
  }

  // --- Magnetic Locks ---
  if (config.magneticLocks > 0) {
    const lockMatch =
      matchPriceItemBySkuOrModel(priceItems, "MAG600BZ") ??
      scorePick(
        priceItems.filter(
          (it) => it.system === "ACCESO" && it.deviceType === "access_magnetic_lock"
        ),
        ["mag600bz", "600lb", "600", "chapa", "magnética", "magnetica"],
        ["280", "280lb", "280kg"]
      ) ??
      matchPriceItem(priceItems, "ACCESO", "access_magnetic_lock");

    const lockCost = lockMatch?.unitCost ?? getEstimatedCost("access_magnetic_lock");
    items.push(
      makeLineItem(
        idx++,
        "5.7.4",
        "ACCESO",
        lockMatch?.sku || "ACC-LOC-001",
        lockMatch?.description || "Chapa magnética 600Lb",
        lockMatch?.unit || "pza",
        config.magneticLocks,
        lockCost,
        lockMatch?.category || "Equipo",
        !lockMatch,
        lockMatch?.brand || "",
        lockMatch?.model || ""
      )
    );

    const mountCandidates = priceItems.filter((it) => {
      if (it.system !== "ACCESO") return false;
      const hay = `${it.sku} ${it.brand} ${it.model} ${it.description}`.toLowerCase();
      return hay.includes("montaje") || hay.includes("z y l") || hay.includes("bzl");
    });
    const mountMatch =
      matchPriceItemBySkuOrModel(priceItems, "BZL600N") ??
      scorePick(
        mountCandidates,
        ["bzl600n", "montaje", "z y l", "zl", "mag600"],
        ["chapa", "cerradura", "magnet"]
      );

    if (mountMatch) {
      const mountCost = mountMatch.unitCost ?? 0;
      items.push(
        makeLineItem(
          idx++,
          "5.7.4",
          "ACCESO",
          mountMatch.sku || "ACC-MNT-001",
          mountMatch.description || "Montaje tipo Z y L para chapa magnética",
          mountMatch.unit || "pza",
          config.magneticLocks,
          mountCost,
          mountMatch.category || "Accesorio",
          false,
          mountMatch.brand || "",
          mountMatch.model || ""
        )
      );
    }
  }

  // --- Exit Buttons ---
  if (config.exitButtons > 0) {
    const btnMatch = matchPriceItem(priceItems, "ACCESO", "access_exit_button");
    const btnCost = btnMatch?.unitCost ?? getEstimatedCost("access_exit_button");
    items.push(
      makeLineItem(idx++, "5.7.4", "ACCESO", "ACC-BTN-001", "Botón de salida", "pza", config.exitButtons, btnCost, "Equipo", !btnMatch, btnMatch?.brand || "", btnMatch?.model || "")
    );
  }

  // --- Touchless Buttons ---
  if (config.touchlessButtons > 0) {
    const tlMatch = matchPriceItem(priceItems, "ACCESO", "access_touchless_button");
    const tlCost = tlMatch?.unitCost ?? getEstimatedCost("access_touchless_button");
    items.push(
      makeLineItem(idx++, "5.7.4", "ACCESO", "ACC-TLB-001", "Botón sin contacto (touchless)", "pza", config.touchlessButtons, tlCost, "Equipo", !tlMatch, tlMatch?.brand || "", tlMatch?.model || "")
    );
  }

  // --- Software Licenses ---
  if (config.softwareLicenses > 0) {
    const swMatch = matchPriceItem(priceItems, "ACCESO", "access_software");
    const swCost = swMatch?.unitCost ?? getEstimatedCost("access_software");
    items.push(
      makeLineItem(idx++, "5.7.4", "ACCESO", "ACC-SW-001", "Licencia de software de acceso", "pza", config.softwareLicenses, swCost, "Equipo", !swMatch, swMatch?.brand || "", swMatch?.model || "")
    );
  }

  // --- Cable ---
  const cableMatch = matchPriceItem(priceItems, "CABLEADO", "cable_utp");
  const cableCost = cableMatch?.unitCost ?? getEstimatedCost("cable_utp");
  items.push(
    makeLineItem(idx++, "5.7.4", "ACCESO", "ACC-CAB-001", "Cable UTP Cat6 para control de acceso", "ml", cableLength, cableCost, "Equipo", !cableMatch, cableMatch?.brand || "", cableMatch?.model || "")
  );

  // --- Conduit ---
  const conduitMatch = matchPriceItem(priceItems, "CANALIZACION", "conduit");
  const conduitCost = conduitMatch?.unitCost ?? getEstimatedCost("conduit");
  items.push(
    makeLineItem(idx++, "5.7.4", "ACCESO", "ACC-CON-001", "Conduit 3/4\" para control de acceso", "ml", conduitLength, conduitCost, "Equipo", !conduitMatch, conduitMatch?.brand || "", conduitMatch?.model || "")
  );

  // --- Conduit fittings ---
  const fittingCount = Math.ceil(conduitLength / 3);
  const codoMatch = matchPriceItem(priceItems, "CANALIZACION", "codo");
  const codoCost = codoMatch?.unitCost ?? getEstimatedCost("codo");
  if (fittingCount > 0) {
    items.push(
      makeLineItem(idx++, "5.7.4", "ACCESO", "ACC-CODO-001", "Codo conduit 3/4\" 90°", "pza", fittingCount, codoCost, "Accesorio", !codoMatch, codoMatch?.brand || "", codoMatch?.model || "")
    );
  }

  // --- Labor ---
  const laborMatch = matchPriceItem(priceItems, "ACCESO", "labor_access");
  const labor = computeLaborAmount(
    factors,
    laborMatch,
    getEstimatedCost("labor_access"),
    totalDevices
  );
  const laborDesc = labor.isCrewBased
    ? `Instalación de sistema de control de acceso (mano de obra) [${labor.crewSummary}]`
    : "Instalación de sistema de control de acceso (mano de obra)";
  items.push(
    makeLineItem(idx++, "5.7.4", "ACCESO", "ACC-MO-001", laborDesc, "lote", 1, labor.total, "Mano de Obra", !laborMatch, laborMatch?.brand || "", laborMatch?.model || "")
  );

  const sums = sumLineItems(items);
  return { ...sums, lineItems: items };
}

export function calculatePaging(
  config: PagingConfig,
  factors: EstimateFactors,
  priceItems: PriceItemRecord[],
  floorplanConfig?: FloorplanConfig
): SystemBreakdown {
  const items: LineItem[] = [];
  let idx = 1;

  const totalSpeakers = config.speakers.reduce((s, sp) => s + sp.qty, 0) + config.bluetoothSpeakers;
  const totalDevices = totalSpeakers + config.amplifiers.qty + config.gateways;

  const pagingNodes = floorplanConfig?.devices?.filter((d) => d.system === "paging") ?? [];
  const spatialResult =
    pagingNodes.length > 0
      ? calculateRealTrajectories(
          pagingNodes,
          floorplanConfig?.racks ?? [],
          floorplanConfig?.scaleMetersPerPx ?? 0.05,
          floorplanConfig?.rackRiseM ?? factors.verticalDrop ?? 2.5,
          floorplanConfig?.slackM ?? factors.rackAllowance ?? 4.0
        )
      : null;

  // Cable
  const cableLength = spatialResult
    ? spatialResult.cableTotalMeters
    : round2(
        (config.avgDistanceMeters + factors.verticalDrop + factors.rackAllowance) *
          totalDevices *
          (1 + factors.wasteFactorCable)
      );

  // Conduit
  const conduitLength = spatialResult
    ? spatialResult.totalConduitMeters
    : round2(config.avgDistanceMeters * totalDevices * (1 + factors.wasteFactorConduit));

  // --- Speakers ---
  for (const sp of config.speakers) {
    const typeLower = sp.type.toLowerCase();
    let devType = "paging_speaker_exterior";
    if (typeLower.includes("colgante")) devType = "paging_speaker_colgante";
    else if (typeLower.includes("ip")) devType = "paging_speaker_ip";

    const matched = matchPriceItem(priceItems, "VOCEO", devType);
    const cost = matched?.unitCost ?? getEstimatedCost(devType);
    items.push(
      makeLineItem(idx++, "5.7.5", "VOCEO", `VOC-SPK-${String(idx).padStart(3, "0")}`, `Altavoz ${sp.type} para sistema de voceo`, "pza", sp.qty, cost, "Equipo", !matched, matched?.brand || "", matched?.model || "")
    );
  }

  // --- Bluetooth Speakers ---
  if (config.bluetoothSpeakers > 0) {
    const btMatch = matchPriceItem(priceItems, "VOCEO", "paging_speaker_bluetooth");
    const btCost = btMatch?.unitCost ?? getEstimatedCost("paging_speaker_bluetooth");
    items.push(
      makeLineItem(idx++, "5.7.5", "VOCEO", "VOC-BT-001", "Altavoz bluetooth", "pza", config.bluetoothSpeakers, btCost, "Equipo", !btMatch, btMatch?.brand || "", btMatch?.model || "")
    );
  }

  // --- Amplifiers ---
  const ampMatch = matchPriceItem(priceItems, "VOCEO", "paging_amplifier");
  const ampCost = ampMatch?.unitCost ?? getEstimatedCost("paging_amplifier");
  items.push(
    makeLineItem(idx++, "5.7.5", "VOCEO", "VOC-AMP-001", `Amplificador ${config.amplifiers.watts}W para voceo`, "pza", config.amplifiers.qty, ampCost, "Equipo", !ampMatch, ampMatch?.brand || "", ampMatch?.model || "")
  );

  // --- Gateways ---
  const gwMatch = matchPriceItem(priceItems, "VOCEO", "paging_gateway");
  const gwCost = gwMatch?.unitCost ?? getEstimatedCost("paging_gateway");
  items.push(
    makeLineItem(idx++, "5.7.5", "VOCEO", "VOC-GW-001", "Gateway VoIP para voceo", "pza", config.gateways, gwCost, "Equipo", !gwMatch, gwMatch?.brand || "", gwMatch?.model || "")
  );

  // --- Cable ---
  const cableMatch = matchPriceItem(priceItems, "CABLEADO", "cable_utp");
  const cableCost = cableMatch?.unitCost ?? getEstimatedCost("cable_utp");
  items.push(
    makeLineItem(idx++, "5.7.5", "VOCEO", "VOC-CAB-001", "Cable UTP Cat6 para voceo", "ml", cableLength, cableCost, "Equipo", !cableMatch, cableMatch?.brand || "", cableMatch?.model || "")
  );

  // --- Speaker wire (alternating) ---
  const speakerWireLength = round2(cableLength * 0.5); // speaker wire only for analog portions
  const spkWireMatch = matchPriceItem(priceItems, "CABLEADO", "cable_speaker");
  const spkWireCost = spkWireMatch?.unitCost ?? getEstimatedCost("cable_speaker");
  items.push(
    makeLineItem(idx++, "5.7.5", "VOCEO", "VOC-SWK-001", "Cable para altavoz", "ml", speakerWireLength, spkWireCost, "Equipo", !spkWireMatch, spkWireMatch?.brand || "", spkWireMatch?.model || "")
  );

  // --- Conduit ---
  const conduitMatch = matchPriceItem(priceItems, "CANALIZACION", "conduit");
  const conduitCost = conduitMatch?.unitCost ?? getEstimatedCost("conduit");
  items.push(
    makeLineItem(idx++, "5.7.5", "VOCEO", "VOC-CON-001", "Conduit 3/4\" para voceo", "ml", conduitLength, conduitCost, "Equipo", !conduitMatch, conduitMatch?.brand || "", conduitMatch?.model || "")
  );

  // --- Conduit fittings ---
  const fittingCount = Math.ceil(conduitLength / 3);
  const codoMatch = matchPriceItem(priceItems, "CANALIZACION", "codo");
  const codoCost = codoMatch?.unitCost ?? getEstimatedCost("codo");
  if (fittingCount > 0) {
    items.push(
      makeLineItem(idx++, "5.7.5", "VOCEO", "VOC-CODO-001", "Codo conduit 3/4\" 90°", "pza", fittingCount, codoCost, "Accesorio", !codoMatch, codoMatch?.brand || "", codoMatch?.model || "")
    );
  }

  // --- Labor ---
  const laborMatch = matchPriceItem(priceItems, "VOCEO", "labor_paging");
  const labor = computeLaborAmount(
    factors,
    laborMatch,
    getEstimatedCost("labor_paging"),
    totalDevices
  );
  const laborDesc = labor.isCrewBased
    ? `Instalación de sistema de voceo (mano de obra) [${labor.crewSummary}]`
    : "Instalación de sistema de voceo (mano de obra)";
  items.push(
    makeLineItem(idx++, "5.7.5", "VOCEO", "VOC-MO-001", laborDesc, "lote", 1, labor.total, "Mano de Obra", !laborMatch, laborMatch?.brand || "", laborMatch?.model || "")
  );

  const sums = sumLineItems(items);
  return { ...sums, lineItems: items };
}

export function calculateFire(
  config: FireConfig,
  factors: EstimateFactors,
  priceItems: PriceItemRecord[],
  floorplanConfig?: FloorplanConfig
): SystemBreakdown {
  const items: LineItem[] = [];
  let idx = 1;

  const totalDevices =
    config.smokeDetectors +
    config.heatDetectors +
    config.manualStations +
    config.strobes +
    config.hornStrobes +
    config.coDetectors;

  // Cable
  const cableLength = round2(
    (config.avgDistanceMeters + factors.verticalDrop + factors.rackAllowance) * totalDevices * (1 + factors.wasteFactorCable)
  );

  // Conduit
  const conduitLength = round2(config.avgDistanceMeters * totalDevices * (1 + factors.wasteFactorConduit));

  // --- Smoke Detectors ---
  if (config.smokeDetectors > 0) {
    const match = matchPriceItem(priceItems, "INCENDIO", "fire_smoke_detector");
    const cost = match?.unitCost ?? getEstimatedCost("fire_smoke_detector");
    items.push(
      makeLineItem(idx++, "5.7.5", "INCENDIO", "FIR-SMK-001", "Detector de humo fotoeléctrico", "pza", config.smokeDetectors, cost, "Equipo", !match, match?.brand || "", match?.model || "")
    );
  }

  // --- Heat Detectors ---
  if (config.heatDetectors > 0) {
    const match = matchPriceItem(priceItems, "INCENDIO", "fire_heat_detector");
    const cost = match?.unitCost ?? getEstimatedCost("fire_heat_detector");
    items.push(
      makeLineItem(idx++, "5.7.5", "INCENDIO", "FIR-HEAT-001", "Detector de temperatura", "pza", config.heatDetectors, cost, "Equipo", !match, match?.brand || "", match?.model || "")
    );
  }

  // --- Manual Stations ---
  if (config.manualStations > 0) {
    const match = matchPriceItem(priceItems, "INCENDIO", "fire_manual_station");
    const cost = match?.unitCost ?? getEstimatedCost("fire_manual_station");
    items.push(
      makeLineItem(idx++, "5.7.5", "INCENDIO", "FIR-MS-001", "Estación manual de alarma", "pza", config.manualStations, cost, "Equipo", !match, match?.brand || "", match?.model || "")
    );
  }

  // --- Strobes ---
  if (config.strobes > 0) {
    const match = matchPriceItem(priceItems, "INCENDIO", "fire_strobe");
    const cost = match?.unitCost ?? getEstimatedCost("fire_strobe");
    items.push(
      makeLineItem(idx++, "5.7.5", "INCENDIO", "FIR-STR-001", "Lámpara estroboscópica", "pza", config.strobes, cost, "Equipo", !match, match?.brand || "", match?.model || "")
    );
  }

  // --- Horn Strobes ---
  if (config.hornStrobes > 0) {
    const match = matchPriceItem(priceItems, "INCENDIO", "fire_horn_strobe");
    const cost = match?.unitCost ?? getEstimatedCost("fire_horn_strobe");
    items.push(
      makeLineItem(idx++, "5.7.5", "INCENDIO", "FIR-HS-001", "Dispositivo audible/visible (horn strobe)", "pza", config.hornStrobes, cost, "Equipo", !match, match?.brand || "", match?.model || "")
    );
  }

  // --- CO Detectors ---
  if (config.coDetectors > 0) {
    const match = matchPriceItem(priceItems, "INCENDIO", "fire_co_detector");
    const cost = match?.unitCost ?? getEstimatedCost("fire_co_detector");
    items.push(
      makeLineItem(idx++, "5.7.5", "INCENDIO", "FIR-CO-001", "Detector de monóxido de carbono", "pza", config.coDetectors, cost, "Equipo", !match, match?.brand || "", match?.model || "")
    );
  }

  // --- Panels ---
  const panelMatch = matchPriceItem(priceItems, "INCENDIO", "fire_panel");
  const panelCost = panelMatch?.unitCost ?? getEstimatedCost("fire_panel");
  items.push(
    makeLineItem(idx++, "5.7.5", "INCENDIO", "FIR-PNL-001", `Panel de alarma contra incendio ${config.panels.loops} lazos`, "pza", config.panels.qty, panelCost, "Equipo", !panelMatch, panelMatch?.brand || "", panelMatch?.model || "")
  );

  // --- Annunciators ---
  if (config.annunciators > 0) {
    const annMatch = matchPriceItem(priceItems, "INCENDIO", "fire_annunciator");
    const annCost = annMatch?.unitCost ?? getEstimatedCost("fire_annunciator");
    items.push(
      makeLineItem(idx++, "5.7.5", "INCENDIO", "FIR-ANN-001", "Anunciador remoto", "pza", config.annunciators, annCost, "Equipo", !annMatch, annMatch?.brand || "", annMatch?.model || "")
    );
  }

  // --- Cable FPLR ---
  const fplrMatch = matchPriceItem(priceItems, "CABLEADO", "cable_fplr");
  const fplrCost = fplrMatch?.unitCost ?? getEstimatedCost("cable_fplr");
  items.push(
    makeLineItem(idx++, "5.7.5", "INCENDIO", "FIR-CAB-001", "Cable FPLR para sistema contra incendio", "ml", cableLength, fplrCost, "Equipo", !fplrMatch, fplrMatch?.brand || "", fplrMatch?.model || "")
  );

  // --- Conduit ---
  const conduitMatch = matchPriceItem(priceItems, "CANALIZACION", "conduit");
  const conduitCost = conduitMatch?.unitCost ?? getEstimatedCost("conduit");
  items.push(
    makeLineItem(idx++, "5.7.5", "INCENDIO", "FIR-CON-001", "Conduit 3/4\" para sistema contra incendio", "ml", conduitLength, conduitCost, "Equipo", !conduitMatch, conduitMatch?.brand || "", conduitMatch?.model || "")
  );

  // --- Conduit fittings ---
  const fittingCount = Math.ceil(conduitLength / 3);
  const codoMatch = matchPriceItem(priceItems, "CANALIZACION", "codo");
  const codoCost = codoMatch?.unitCost ?? getEstimatedCost("codo");
  if (fittingCount > 0) {
    items.push(
      makeLineItem(idx++, "5.7.5", "INCENDIO", "FIR-CODO-001", "Codo conduit 3/4\" 90°", "pza", fittingCount, codoCost, "Accesorio", !codoMatch, codoMatch?.brand || "", codoMatch?.model || "")
    );
  }

  // --- Labor ---
  const laborMatch = matchPriceItem(priceItems, "INCENDIO", "labor_fire");
  const labor = computeLaborAmount(
    factors,
    laborMatch,
    getEstimatedCost("labor_fire"),
    totalDevices
  );
  const laborDesc = labor.isCrewBased
    ? `Instalación de sistema contra incendio (mano de obra) [${labor.crewSummary}]`
    : "Instalación de sistema contra incendio (mano de obra)";
  items.push(
    makeLineItem(idx++, "5.7.5", "INCENDIO", "FIR-MO-001", laborDesc, "lote", 1, labor.total, "Mano de Obra", !laborMatch, laborMatch?.brand || "", laborMatch?.model || "")
  );

  const sums = sumLineItems(items);
  return { ...sums, lineItems: items };
}

// ─── Estimated costs (fallback when no DB match) ────────────────────────────

function getEstimatedCost(key: string): number {
  const costs: Record<string, number> = {
    cctv_camera_bullet: 7805.18,
    cctv_camera_domo: 8210.45,
    cctv_camera_ptz: 28500.0,
    cctv_camera_fisheye: 15200.0,
    cctv_camera_panoramic: 12500.0,
    cctv_nvr: 45600.0,
    cctv_disk: 5200.0,
    cctv_license: 850.0,
    cable_utp: 28.5,
    // Cable UTP por ML (se convierte a bobina 305m en CCTV)
    "PUR6004BU-FE": 22.12,
    cable_fplr: 42.0,
    cable_speaker: 18.0,
    conduit: 38.5,
    codo: 15.0,
    cople: 12.0,
    conector: 22.0,
    soporte: 65.0,
    caja: 185.0,
    tapa: 95.0,
    flexible_plica: 45.0,
    labor_cctv: 450.0,
    cctv_switch: 9500.0,
    cctv_ups: 8500.0,
    cctv_rack: 12000.0,
    cctv_monitor: 4500.0,
    cctv_service: 6500.0,

    // CCTV - Auto BOM por SKU
    "USW-PRO-48-POE": 28500.0,
    "USW-PRO-24-POE": 19500.0,
    "PATCH-PANEL-48": 12999.17,
    "PATCH-CORD-7": 322.32,
    "CJ688TGIW": 175.0,
    "CFPE21WY": 65.0,
    "CMB1W-X": 35.0,
    "WMP1E": 450.0,
    "WMPV45E": 1750.0,
    "VELCRO-ROLL": 180.0,
    "PDU-15A": 1250.0,
    "UPS-2000VA": 8500.0,
    "Rack-2P-45U": 12000.0,
    "Samsung-QBC-55": 18500.0,
    "CAN-LOT": 8500.0,

    // CCTV - Servicios/Entregables (fallback)
    "SRV-CERT-TEST": 120.0,  // por cámara
    "SRV-LABEL": 35.0,       // por cámara
    "SRV-PLN": 4500.0,       // 1
    "SRV-INST-CAB": 250.0,   // por cámara (si se usa LOTE, se toma como costo del lote)
    "SRV-INST-CCTV": 8500.0, // 1
    "MISC-LOT": 1200.0,      // 1
    labor_access: 380.0,
    labor_paging: 350.0,
    labor_fire: 420.0,
    access_reader: 9800.0,
    access_controller: 12500.0,
    access_turnstile: 35000.0,
    access_magnetic_lock: 2850.0,
    access_exit_button: 285.0,
    access_touchless_button: 650.0,
    access_software: 2200.0,
    paging_speaker_exterior: 3200.0,
    paging_speaker_colgante: 2800.0,
    paging_speaker_ip: 5500.0,
    paging_speaker_bluetooth: 4200.0,
    paging_amplifier: 8500.0,
    paging_gateway: 12000.0,
    fire_smoke_detector: 1450.0,
    fire_heat_detector: 1200.0,
    fire_manual_station: 680.0,
    fire_strobe: 850.0,
    fire_horn_strobe: 1150.0,
    fire_co_detector: 2800.0,
    fire_panel: 68000.0,
    fire_annunciator: 8500.0,
  };
  return costs[key] ?? 1000.0;
}

// ─── Main Calculation Function ───────────────────────────────────────────────

export function runCalculation(params: {
  cctvConfig?: CctvConfig;
  accessConfig?: AccessConfig;
  pagingConfig?: PagingConfig;
  fireConfig?: FireConfig;
  floorplanConfig?: FloorplanConfig;
  factors: EstimateFactors;
  priceItems: PriceItemRecord[];
}): CalculationResult {
  const { cctvConfig, accessConfig, pagingConfig, fireConfig, floorplanConfig, factors, priceItems } = params;
  const policy: RoundingPolicy = factors.roundingPolicy ?? 2;
  const r = (n: number) => roundByPolicy(n, policy);

  const systems: Record<string, SystemBreakdown> = {};
  const allLineItems: LineItem[] = [];
  const warnings: string[] = [];

  if (cctvConfig && cctvConfig.cameras?.length > 0) {
    systems["CCTV"] = calculateCCTV(cctvConfig, factors, priceItems, floorplanConfig);
    allLineItems.push(...systems["CCTV"].lineItems);
  }

  if (accessConfig && accessConfig.doors > 0) {
    systems["ACCESO"] = calculateAccess(accessConfig, factors, priceItems, floorplanConfig);
    allLineItems.push(...systems["ACCESO"].lineItems);
  }

  if (pagingConfig && (pagingConfig.speakers?.length > 0 || pagingConfig.bluetoothSpeakers > 0)) {
    systems["VOCEO"] = calculatePaging(pagingConfig, factors, priceItems, floorplanConfig);
    allLineItems.push(...systems["VOCEO"].lineItems);
  }

  if (fireConfig && (fireConfig.smokeDetectors > 0 || fireConfig.heatDetectors > 0 || fireConfig.manualStations > 0)) {
    systems["INCENDIO"] = calculateFire(fireConfig, factors, priceItems, floorplanConfig);
    allLineItems.push(...systems["INCENDIO"].lineItems);
  }

  // Recolectar advertencias normativas si existen nodos en los planos del proyecto
  const fpList = getFloorplansList(floorplanConfig);
  fpList.forEach((fp) => {
    if (fp.devices && fp.devices.length > 0) {
      const pathwaySegmentsList: Segment[] = [];
      if (fp.pathwayNodes && fp.pathwaySegments) {
        const nodeMap = new Map((fp.pathwayNodes as any[]).map((n) => [n.id, n]));
        (fp.pathwaySegments as any[]).forEach((seg) => {
          const from = nodeMap.get(seg.fromId);
          const to = nodeMap.get(seg.toId);
          if (from && to) {
            pathwaySegmentsList.push({ a: { x: from.x, y: from.y }, b: { x: to.x, y: to.y } });
          }
        });
      }
      const globalSpatial = calculateRealTrajectories(
        fp.devices,
        fp.racks ?? [],
        fp.scaleMetersPerPx ?? 0.05,
        fp.rackRiseM ?? factors.verticalDrop ?? 2.5,
        fp.slackM ?? factors.rackAllowance ?? 4.0,
        pathwaySegmentsList
      );
      const prefix = (fp as any).name ? `[${(fp as any).name}] ` : "";
      globalSpatial.warnings.forEach((w) => warnings.push(`${prefix}${w}`));
    }
  });

  // Add general/service items from price items
  const serviceItems = priceItems.filter(
    (pi) => pi.system === "GENERAL" && pi.category === "Servicio" && pi.active
  );
  const generalLineItems: LineItem[] = [];
  serviceItems.forEach((si, i) => {
    generalLineItems.push(
      makeLineItem(
        i + 1, "5.7.0", "GENERAL", `SRV-${String(i + 1).padStart(3, "0")}`,
        si.description, si.unit, 1, si.unitCost, "Servicio"
      )
    );
  });
  if (generalLineItems.length > 0) {
    systems["GENERAL"] = { ...sumLineItems(generalLineItems), lineItems: generalLineItems };
    allLineItems.push(...generalLineItems);
  }

  const subtotalMaterials = r(allLineItems.filter((i) => i.category === "Equipo" || i.category === "Accesorio" || i.category === "Consumible").reduce((s, i) => s + i.totalAmount, 0));
  const subtotalLabor = r(allLineItems.filter((i) => i.category === "Mano de Obra").reduce((s, i) => s + i.totalAmount, 0));
  const subtotalEngineering = r(allLineItems.filter((i) => i.category === "Ingeniería").reduce((s, i) => s + i.totalAmount, 0));
  const subtotalServices = r(allLineItems.filter((i) => i.category === "Servicio").reduce((s, i) => s + i.totalAmount, 0));

  const subtotalDirect = r(subtotalMaterials + subtotalLabor + subtotalEngineering + subtotalServices);
  const subtotalIndirects = r(subtotalDirect * factors.indirectFactor);
  const subtotalUtility = r((subtotalDirect + subtotalIndirects) * factors.utilityFactor);
  const grandTotal = r(subtotalDirect + subtotalIndirects + subtotalUtility);
  // IVA se calcula sobre el grandTotal (TASK §7, §9.1)
  const iva = r(grandTotal * factors.ivaRate);
  const totalWithIva = r(grandTotal + iva);

  return {
    systems,
    subtotalMaterials,
    subtotalLabor,
    subtotalEngineering,
    subtotalServices,
    subtotalDirect,
    subtotalIndirects,
    subtotalUtility,
    grandTotal,
    iva,
    totalWithIva,
    lineItems: allLineItems,
    warnings,
  };
}

export interface SystemSpatialMetrics {
  systemKey: "cctv" | "access" | "paging" | "fire";
  systemName: string;
  // 1. Cálculo Espacial 2.5D
  cableTotalMeters: number;
  totalConduitMeters: number;
  totalTrayMeters: number;
  coveredAreaM2: number;
  // 2. Acumulado General del Sistema
  deviceCount: number;
  spools305m: number;
  conduitTubes3m: number;
  traySections3m: number;
  boxes4x4Qty: number;
  emtConnectorsQty: number;
  subTypeCounts: Record<string, number>;
}

export interface ConsolidatedSpatialGrandTotal {
  // 1. Gran Total del Cálculo Espacial 2.5D
  grandTotalCableMeters: number;
  grandTotalConduitMeters: number;
  grandTotalTrayMeters: number;
  grandTotalCoveredAreaM2: number;
  // 2. Acumulado General Global
  grandTotalDevicesCount: number;
  grandTotalSpools305m: number;
  grandTotalConduitTubes3m: number;
  grandTotalTraySections3m: number;
  grandTotalBoxes4x4Qty: number;
  grandTotalEmtConnectorsQty: number;
}

export interface SystemMetricsBreakdownResult {
  bySystem: Record<"cctv" | "access" | "paging" | "fire", SystemSpatialMetrics>;
  grandTotal: ConsolidatedSpatialGrandTotal;
}

const SYSTEM_COVERAGE_RADIUS_M: Record<string, number> = {
  cctv: 15,
  access: 5,
  paging: 12,
  fire: 9,
};

export function calculateSystemMetricsBreakdown(
  rawFloorplanConfig: any,
  rackRiseMDefault: number = 2.5,
  slackMDefault: number = 4.0
): SystemMetricsBreakdownResult {
  const fps = getFloorplansList(rawFloorplanConfig);

  const systemsKeys: Array<"cctv" | "access" | "paging" | "fire"> = ["cctv", "access", "paging", "fire"];
  const systemNames: Record<string, string> = {
    cctv: "CCTV (Videovigilancia)",
    access: "ACCES (Control de Accesos)",
    paging: "PAGING (Sistema de Megafonía)",
    fire: "FIRE (Sistema Contra Incendios)",
  };

  const bySystem: Record<"cctv" | "access" | "paging" | "fire", SystemSpatialMetrics> = {
    cctv: { systemKey: "cctv", systemName: systemNames.cctv, cableTotalMeters: 0, totalConduitMeters: 0, totalTrayMeters: 0, coveredAreaM2: 0, deviceCount: 0, spools305m: 0, conduitTubes3m: 0, traySections3m: 0, boxes4x4Qty: 0, emtConnectorsQty: 0, subTypeCounts: {} },
    access: { systemKey: "access", systemName: systemNames.access, cableTotalMeters: 0, totalConduitMeters: 0, totalTrayMeters: 0, coveredAreaM2: 0, deviceCount: 0, spools305m: 0, conduitTubes3m: 0, traySections3m: 0, boxes4x4Qty: 0, emtConnectorsQty: 0, subTypeCounts: {} },
    paging: { systemKey: "paging", systemName: systemNames.paging, cableTotalMeters: 0, totalConduitMeters: 0, totalTrayMeters: 0, coveredAreaM2: 0, deviceCount: 0, spools305m: 0, conduitTubes3m: 0, traySections3m: 0, boxes4x4Qty: 0, emtConnectorsQty: 0, subTypeCounts: {} },
    fire: { systemKey: "fire", systemName: systemNames.fire, cableTotalMeters: 0, totalConduitMeters: 0, totalTrayMeters: 0, coveredAreaM2: 0, deviceCount: 0, spools305m: 0, conduitTubes3m: 0, traySections3m: 0, boxes4x4Qty: 0, emtConnectorsQty: 0, subTypeCounts: {} },
  };

  for (const fp of fps) {
    if (!fp.devices || fp.devices.length === 0) continue;

    const scale = fp.scaleMetersPerPx || 0.05;
    const pathwaySegmentsList: Segment[] = [];
    if (fp.pathwayNodes && fp.pathwaySegments) {
      const nodeMap = new Map((fp.pathwayNodes as any[]).map((n) => [n.id, n]));
      (fp.pathwaySegments as any[]).forEach((seg) => {
        const from = nodeMap.get(seg.fromId);
        const to = nodeMap.get(seg.toId);
        if (from && to) {
          pathwaySegmentsList.push({ a: { x: from.x, y: from.y }, b: { x: to.x, y: to.y } });
        }
      });
    }

    for (const sysKey of systemsKeys) {
      const sysDevices = fp.devices.filter((d) => String(d.system).toLowerCase() === sysKey);
      if (sysDevices.length === 0) continue;

      const res = calculateRealTrajectories(
        sysDevices,
        fp.racks || [],
        scale,
        fp.rackRiseM ?? rackRiseMDefault,
        fp.slackM ?? slackMDefault,
        pathwaySegmentsList
      );

      const target = bySystem[sysKey];
      target.deviceCount += sysDevices.length;

      // Subtypes
      sysDevices.forEach((dev) => {
        const sub = dev.subType || "Dispositivo";
        target.subTypeCounts[sub] = (target.subTypeCounts[sub] || 0) + 1;
      });

      if (sysKey === 'fire') {
        const fireDevs = sysDevices.map((d) => ({
          id: d.id,
          tipo: d.subType || 'Detector de Humo',
          x_px: d.x,
          y_px: d.y,
        }));
        const defaultPanel = fp.racks?.[0] || { x: 0, y: 0 };
        const res3D = calcularMetrajeCable3DFire(
          fireDevs,
          'B',
          { x: defaultPanel.x, y: defaultPanel.y },
          scale,
          {
            hLosaM: (fp as any).hLosaM || 3.8,
            hPlafonM: (fp as any).hPlafonM || 3.0,
            largoM: 30.0,
            anchoM: 20.0,
            slackPorBaseM: 0.20,
            margenDesperdicio: 0.10,
          }
        );
        target.cableTotalMeters += res3D.metrajeTotalM;
        target.totalConduitMeters += res3D.canalizacionEmtTotalM;
        target.totalTrayMeters = 0;
        target.coveredAreaM2 += res3D.superficieM2;
      } else {
        target.cableTotalMeters += res.cableTotalMeters;
        target.totalConduitMeters += res.totalConduitMeters;
        target.totalTrayMeters += res.totalTrayMeters;
        const radiusM = SYSTEM_COVERAGE_RADIUS_M[sysKey] || 10;
        const devAreaM2 = Math.PI * radiusM * radiusM;
        const levelSysCovered = Math.round(sysDevices.length * devAreaM2 * 0.85);
        target.coveredAreaM2 += levelSysCovered;
      }
    }
  }

  // Commercial Conversions & Rounding per system
  for (const sysKey of systemsKeys) {
    const s = bySystem[sysKey];
    if (sysKey === 'fire') {
      s.totalTrayMeters = 0;
      const totalLazos = Math.max(1, Math.ceil(s.deviceCount / 127));
      if (totalLazos > 1) {
        const extraPanelDropM = (totalLazos - 1) * (3.8 - 1.5);
        s.totalConduitMeters += extraPanelDropM;
        s.cableTotalMeters += extraPanelDropM * 1.10;
      }
    }
    s.cableTotalMeters = Math.round(s.cableTotalMeters * 100) / 100;
    s.totalConduitMeters = Math.round(s.totalConduitMeters * 100) / 100;
    s.totalTrayMeters = Math.round(s.totalTrayMeters * 100) / 100;
    s.spools305m = Math.ceil(s.cableTotalMeters / 305);
    s.conduitTubes3m = Math.ceil(s.totalConduitMeters / 3);
    s.traySections3m = sysKey === 'fire' ? 0 : Math.ceil(s.totalTrayMeters / 3);
    s.boxes4x4Qty = s.deviceCount;
    s.emtConnectorsQty = s.conduitTubes3m * 2 + s.boxes4x4Qty * 2;
  }

  // Consolidated Grand Total
  const grandTotal: ConsolidatedSpatialGrandTotal = {
    grandTotalCableMeters: Math.round(systemsKeys.reduce((sum, k) => sum + bySystem[k].cableTotalMeters, 0) * 100) / 100,
    grandTotalConduitMeters: Math.round(systemsKeys.reduce((sum, k) => sum + bySystem[k].totalConduitMeters, 0) * 100) / 100,
    grandTotalTrayMeters: Math.round(systemsKeys.reduce((sum, k) => sum + bySystem[k].totalTrayMeters, 0) * 100) / 100,
    grandTotalCoveredAreaM2: systemsKeys.reduce((sum, k) => sum + bySystem[k].coveredAreaM2, 0),
    grandTotalDevicesCount: systemsKeys.reduce((sum, k) => sum + bySystem[k].deviceCount, 0),
    grandTotalSpools305m: systemsKeys.reduce((sum, k) => sum + bySystem[k].spools305m, 0),
    grandTotalConduitTubes3m: systemsKeys.reduce((sum, k) => sum + bySystem[k].conduitTubes3m, 0),
    grandTotalTraySections3m: systemsKeys.reduce((sum, k) => sum + bySystem[k].traySections3m, 0),
    grandTotalBoxes4x4Qty: systemsKeys.reduce((sum, k) => sum + bySystem[k].boxes4x4Qty, 0),
    grandTotalEmtConnectorsQty: systemsKeys.reduce((sum, k) => sum + bySystem[k].emtConnectorsQty, 0),
  };

  return { bySystem, grandTotal };
}
