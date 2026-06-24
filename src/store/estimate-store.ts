import { create } from "zustand";

// ─── Types matching the calculator.ts ───────────────────────────────────

export interface CameraEntry {
  type: string;
  qty: number;
  hasPoE: boolean;
}

export interface CctvConfig {
  cameras: CameraEntry[];
  nvr: { qty: number; bays: number; storageTB: number; disksPerBay: number };
  avgDistanceMeters: number;
  licenses: number;
}

export interface AccessConfig {
  doors: number;
  readerType: string;
  controllers: number;
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
}

export interface LineItem {
  partida: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitCost: number;
  total: number;
  system: string;
  category: string;
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
}

// ─── Store interface ────────────────────────────────────────────────────

interface EstimateStore {
  // Estimate metadata
  estimateId: string | null;
  name: string;
  clientName: string;
  projectName: string;
  currency: "MXN" | "USD";

  // System configs
  cctvConfig: CctvConfig;
  accessConfig: AccessConfig;
  pagingConfig: PagingConfig;
  fireConfig: FireConfig;

  // Factors
  factors: EstimateFactors;

  // Results
  result: CalculationResult | null;
  isCalculating: boolean;

  // Active view
  activeView: "config" | "prices" | "budget";

  // Actions
  setEstimateId: (id: string) => void;
  setName: (name: string) => void;
  setClientName: (name: string) => void;
  setProjectName: (name: string) => void;
  setCurrency: (c: "MXN" | "USD") => void;
  setCctvConfig: (config: CctvConfig) => void;
  setAccessConfig: (config: AccessConfig) => void;
  setPagingConfig: (config: PagingConfig) => void;
  setFireConfig: (config: FireConfig) => void;
  setFactors: (factors: EstimateFactors) => void;
  setResult: (result: CalculationResult | null) => void;
  setIsCalculating: (v: boolean) => void;
  setActiveView: (v: "config" | "prices" | "budget") => void;
  loadEstimate: (data: Record<string, unknown>) => void;
  resetAll: () => void;
}

// ─── Defaults ───────────────────────────────────────────────────────────

const defaultCctv: CctvConfig = {
  cameras: [
    { type: "IP Bullet", qty: 0, hasPoE: true },
    { type: "IP Domo", qty: 0, hasPoE: true },
    { type: "PTZ", qty: 0, hasPoE: true },
    { type: "Fisheye", qty: 0, hasPoE: true },
  ],
  nvr: { qty: 0, bays: 2, storageTB: 4, disksPerBay: 1 },
  avgDistanceMeters: 50,
  licenses: 0,
};

const defaultAccess: AccessConfig = {
  doors: 0,
  readerType: "Biometrica",
  controllers: 0,
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
};

// ─── Store ──────────────────────────────────────────────────────────────

export const useEstimateStore = create<EstimateStore>((set) => ({
  estimateId: null,
  name: "Nuevo Presupuesto",
  clientName: "",
  projectName: "",
  currency: "MXN",

  cctvConfig: defaultCctv,
  accessConfig: defaultAccess,
  pagingConfig: defaultPaging,
  fireConfig: defaultFire,

  factors: defaultFactors,

  result: null,
  isCalculating: false,

  activeView: "config",

  setEstimateId: (id) => set({ estimateId: id }),
  setName: (name) => set({ name }),
  setClientName: (name) => set({ clientName: name }),
  setProjectName: (name) => set({ projectName: name }),
  setCurrency: (c) => set({ currency: c }),
  setCctvConfig: (cctvConfig) => set({ cctvConfig }),
  setAccessConfig: (accessConfig) => set({ accessConfig }),
  setPagingConfig: (pagingConfig) => set({ pagingConfig }),
  setFireConfig: (fireConfig) => set({ fireConfig }),
  setFactors: (factors) => set({ factors }),
  setResult: (result) => set({ result }),
  setIsCalculating: (v) => set({ isCalculating: v }),
  setActiveView: (activeView) => set({ activeView }),
  loadEstimate: (data) =>
    set({
      estimateId: data.id as string,
      name: (data.name as string) || "Sin nombre",
      clientName: (data.clientName as string) || "",
      projectName: (data.projectName as string) || "",
      currency: (data.currency as "MXN" | "USD") || "MXN",
      cctvConfig: data.cctvConfig ? (data.cctvConfig as CctvConfig) : defaultCctv,
      accessConfig: data.accessConfig ? (data.accessConfig as AccessConfig) : defaultAccess,
      pagingConfig: data.pagingConfig ? (data.pagingConfig as PagingConfig) : defaultPaging,
      fireConfig: data.fireConfig ? (data.fireConfig as FireConfig) : defaultFire,
      factors: {
        wasteFactorCable: (data.wasteFactorCable as number) ?? defaultFactors.wasteFactorCable,
        wasteFactorConduit: (data.wasteFactorConduit as number) ?? defaultFactors.wasteFactorConduit,
        verticalDrop: (data.verticalDrop as number) ?? defaultFactors.verticalDrop,
        rackAllowance: (data.rackAllowance as number) ?? defaultFactors.rackAllowance,
        indirectFactor: (data.indirectFactor as number) ?? defaultFactors.indirectFactor,
        utilityFactor: (data.utilityFactor as number) ?? defaultFactors.utilityFactor,
      },
      result: data.lineItems
        ? ({
            lineItems: data.lineItems as LineItem[],
            subtotalMaterials: (data.subtotalMaterials as number) ?? 0,
            subtotalLabor: (data.subtotalLabor as number) ?? 0,
            subtotalEngineering: (data.subtotalEngineering as number) ?? 0,
            subtotalDirect: (data.subtotalDirect as number) ?? 0,
            subtotalIndirects: (data.subtotalIndirects as number) ?? 0,
            subtotalUtility: (data.subtotalUtility as number) ?? 0,
            grandTotal: (data.grandTotal as number) ?? 0,
          })
        : null,
    }),
  resetAll: () =>
    set({
      estimateId: null,
      name: "Nuevo Presupuesto",
      clientName: "",
      projectName: "",
      currency: "MXN",
      cctvConfig: defaultCctv,
      accessConfig: defaultAccess,
      pagingConfig: defaultPaging,
      fireConfig: defaultFire,
      factors: defaultFactors,
      result: null,
      isCalculating: false,
      activeView: "config",
    }),
}));