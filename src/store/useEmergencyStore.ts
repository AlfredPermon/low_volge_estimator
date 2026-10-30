import { create } from 'zustand';
import { FloorplanDevice } from '@/store/estimate-store';
import {
  EmergencySignDevice,
  NOM026SignCategory,
  EmergencyExitType,
  ArrowDirection,
  SignMaterial,
  SignMountingType,
} from '@/types/emergencySignage';
import {
  calculateNOM026Dimensions,
  validateEmergencySignNormative,
  UNIT_COSTS_MXN,
} from '@/lib/emergencyNormativeValidator';

export type EmergencyToolMode =
  | 'SELECT'
  | 'SEED_EXIT'
  | 'SEED_STAIR'
  | 'SEED_ARROW'
  | 'SEED_SAFE_ZONE'
  | 'SEED_FIRST_AID';

interface EmergencyStoreState {
  // Active tool and layer states
  activeTool: EmergencyToolMode;
  showCoverageDistances: boolean;

  // Selected tool parameters
  selectedCategory: NOM026SignCategory;
  selectedExitType: EmergencyExitType;
  selectedArrowDirection: ArrowDirection;
  selectedViewingDistanceM: number;
  selectedMaterial: SignMaterial;
  selectedMountingType: SignMountingType;
  mountingHeightDefault: number;
  isPhotoluminescentDefault: boolean;

  // Collection of placed emergency devices
  devices: EmergencySignDevice[];

  // Actions
  setActiveTool: (tool: EmergencyToolMode) => void;
  setShowCoverageDistances: (show: boolean) => void;
  toggleShowCoverageDistances: () => void;

  setSelectedCategory: (cat: NOM026SignCategory) => void;
  setSelectedExitType: (type: EmergencyExitType) => void;
  setSelectedArrowDirection: (dir: ArrowDirection) => void;
  setSelectedViewingDistanceM: (distM: number) => void;
  setSelectedMaterial: (mat: SignMaterial) => void;
  setSelectedMountingType: (mounting: SignMountingType) => void;
  setMountingHeightDefault: (h: number) => void;
  setIsPhotoluminescentDefault: (flag: boolean) => void;

  setDevices: (devices: EmergencySignDevice[]) => void;
  addEmergencyDevice: (
    device: Omit<
      EmergencySignDevice,
      'id' | 'surfaceAreaM2' | 'widthM' | 'heightM' | 'isValidLocation' | 'validationAlerts'
    > & { id?: string },
    scaleMetersPerPx?: number
  ) => EmergencySignDevice;
  removeEmergencyDevice: (id: string, scaleMetersPerPx?: number) => void;
  updateEmergencyDevice: (
    id: string,
    patch: Partial<EmergencySignDevice>,
    scaleMetersPerPx?: number
  ) => void;
  clearEmergencyDevices: () => void;
  validateAll: (scaleMetersPerPx?: number) => void;

  // Persistencia: sembrar en config.devices y rehidratar desde la BD
  syncEmergencyToFloorplanConfig: (
    devices: EmergencySignDevice[],
    scaleMetersPerPx?: number
  ) => void;
  hydrateFromFloorplanDevices: (
    devices: FloorplanDevice[],
    planoId: string,
    scaleMetersPerPx?: number
  ) => void;
}

// ─── Helpers de persistencia NOM-026 ──────────────────────────────────────

const VALID_CATEGORIES: NOM026SignCategory[] = [
  'SALIDA_DE_EMERGENCIA',
  'RUTA_DE_EVACUACION',
  'ESCALERA_DE_EMERGENCIA',
  'ZONA_DE_SEGURIDAD',
  'PRIMEROS_AUXILIOS',
];

const VALID_EXIT_TYPES: EmergencyExitType[] = [
  'DIRECT_EXTERIOR',
  'STAIRWAY',
  'CORRIDOR_DOOR',
  'SAFE_ZONE_POINT',
];

const VALID_ARROW_DIRECTIONS: ArrowDirection[] = [
  'RIGHT',
  'LEFT',
  'UP',
  'DOWN',
  'UP_RIGHT',
  'UP_LEFT',
  'DOWN_RIGHT',
  'DOWN_LEFT',
];

const VALID_MATERIALS: SignMaterial[] = [
  'ACRILICO_FOTOLUMINISCENTE',
  'VINILO_ADHERIBLE',
  'ALUMINIO_FOTOLUMINISCENTE',
  'ESTRUCTURA_BANDERA',
];

const VALID_MOUNTING_TYPES: SignMountingType[] = [
  'ADHERIDO_PARED',
  'SOBRE_PUERTA',
  'TIPO_BANDERA',
  'COLGANTE_TECHO',
];

function asEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return typeof value === 'string' && (allowed as string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * Reconstruye un dispositivo NOM-026 completo a partir de un FloorplanDevice
 * persistido (con emergencyData), recalculando dimensiones normativas.
 */
export function rebuildEmergencyDeviceFromFloorplan(
  d: FloorplanDevice,
  planoId: string
): EmergencySignDevice | null {
  if (d.system !== 'emergency_exit') return null;
  const ed = d.emergencyData;

  const category = asEnum<NOM026SignCategory>(
    ed?.category,
    VALID_CATEGORIES,
    'SALIDA_DE_EMERGENCIA'
  );
  const viewingDistanceM =
    typeof ed?.viewingDistanceM === 'number' && ed.viewingDistanceM > 0
      ? ed.viewingDistanceM
      : 15;

  const dims = calculateNOM026Dimensions(viewingDistanceM, category);
  const costs = UNIT_COSTS_MXN[category] || { material: 150, install: 60 };

  return {
    id: d.id,
    x: d.x,
    y: d.y,
    planoId,
    category,
    subType: d.subType || category,
    exitType: ed?.exitType
      ? asEnum<EmergencyExitType>(ed.exitType, VALID_EXIT_TYPES, 'DIRECT_EXTERIOR')
      : undefined,
    arrowDirection: ed?.arrowDirection
      ? asEnum<ArrowDirection>(ed.arrowDirection, VALID_ARROW_DIRECTIONS, 'RIGHT')
      : undefined,
    arrowAngle: typeof ed?.arrowAngle === 'number' ? ed.arrowAngle : undefined,
    viewingDistanceM,
    surfaceAreaM2: dims.surfaceAreaM2,
    widthM: dims.widthM,
    heightM: dims.heightM,
    mountingHeightM:
      typeof ed?.mountingHeightM === 'number'
        ? ed.mountingHeightM
        : d.verticalDropM ?? 2.2,
    distFromCeilingM:
      typeof ed?.distFromCeilingM === 'number' ? ed.distFromCeilingM : 0.3,
    illuminationLux:
      typeof ed?.illuminationLux === 'number' ? ed.illuminationLux : 50,
    isPhotoluminescent:
      typeof ed?.isPhotoluminescent === 'boolean' ? ed.isPhotoluminescent : true,
    material: asEnum<SignMaterial>(
      ed?.material,
      VALID_MATERIALS,
      'ACRILICO_FOTOLUMINISCENTE'
    ),
    mountingType: asEnum<SignMountingType>(
      ed?.mountingType,
      VALID_MOUNTING_TYPES,
      'SOBRE_PUERTA'
    ),
    isValidLocation: true,
    validationAlerts: [],
    associatedRouteId: ed?.associatedRouteId,
    unitCostMxn:
      typeof ed?.unitCostMxn === 'number' ? ed.unitCostMxn : costs.material,
  };
}

export const useEmergencyStore = create<EmergencyStoreState>((set, get) => ({
  activeTool: 'SELECT',
  showCoverageDistances: true,

  selectedCategory: 'SALIDA_DE_EMERGENCIA',
  selectedExitType: 'DIRECT_EXTERIOR',
  selectedArrowDirection: 'RIGHT',
  selectedViewingDistanceM: 15,
  selectedMaterial: 'ACRILICO_FOTOLUMINISCENTE',
  selectedMountingType: 'SOBRE_PUERTA',
  mountingHeightDefault: 2.20,
  isPhotoluminescentDefault: true,

  devices: [],

  setActiveTool: (activeTool) => set({ activeTool }),
  setShowCoverageDistances: (showCoverageDistances) => set({ showCoverageDistances }),
  toggleShowCoverageDistances: () =>
    set((state) => ({ showCoverageDistances: !state.showCoverageDistances })),

  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setSelectedExitType: (selectedExitType) => set({ selectedExitType }),
  setSelectedArrowDirection: (selectedArrowDirection) => set({ selectedArrowDirection }),
  setSelectedViewingDistanceM: (selectedViewingDistanceM) => set({ selectedViewingDistanceM }),
  setSelectedMaterial: (selectedMaterial) => set({ selectedMaterial }),
  setSelectedMountingType: (selectedMountingType) => set({ selectedMountingType }),
  setMountingHeightDefault: (mountingHeightDefault) => set({ mountingHeightDefault }),
  setIsPhotoluminescentDefault: (isPhotoluminescentDefault) =>
    set({ isPhotoluminescentDefault }),

  setDevices: (devices) => set({ devices }),

  addEmergencyDevice: (data, scaleMetersPerPx = 0.05) => {
    const dims = calculateNOM026Dimensions(data.viewingDistanceM, data.category);
    const costs = UNIT_COSTS_MXN[data.category] || { material: 150, install: 60 };

    const newDevice: EmergencySignDevice = {
      ...data,
      id: data.id || `emg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      surfaceAreaM2: dims.surfaceAreaM2,
      widthM: dims.widthM,
      heightM: dims.heightM,
      unitCostMxn: data.unitCostMxn || costs.material,
      isValidLocation: true,
      validationAlerts: [],
    };

    const current = get().devices;
    const updated = [...current.filter((d) => d.id !== newDevice.id), newDevice];

    const validatedList = updated.map((item) => {
      const v = validateEmergencySignNormative(item, updated, scaleMetersPerPx);
      return {
        ...item,
        isValidLocation: v.isValid,
        validationAlerts: v.alerts,
      };
    });

    set({ devices: validatedList });
    return validatedList.find((d) => d.id === newDevice.id) || newDevice;
  },

  removeEmergencyDevice: (id, scaleMetersPerPx = 0.05) => {
    const updated = get().devices.filter((d) => d.id !== id);
    const validatedList = updated.map((item) => {
      const v = validateEmergencySignNormative(item, updated, scaleMetersPerPx);
      return {
        ...item,
        isValidLocation: v.isValid,
        validationAlerts: v.alerts,
      };
    });
    set({ devices: validatedList });

    // Sincronizar la eliminación con config.devices para que "Guardar"
    // persista en BD el borrado de la señal (evita conteos fantasma).
    try {
      const mod = require('@/store/estimate-store') as {
        useEstimateStore: {
          getState: () => {
            floorplanConfig: any;
            removeFloorplanDevice: (id: string) => void;
          };
        };
      };
      const est = mod.useEstimateStore.getState();
      const exists = (est.floorplanConfig?.devices || []).some(
        (d: FloorplanDevice) => d.id === id && d.system === 'emergency_exit'
      );
      if (exists) est.removeFloorplanDevice(id);
    } catch {
      /* noop */
    }
  },

  updateEmergencyDevice: (id, patch, scaleMetersPerPx = 0.05) => {
    const current = get().devices;
    const updated = current.map((item) => {
      if (item.id === id) {
        const cat = patch.category || item.category;
        const distM = patch.viewingDistanceM || item.viewingDistanceM;
        const dims = calculateNOM026Dimensions(distM, cat);
        return {
          ...item,
          ...patch,
          surfaceAreaM2: dims.surfaceAreaM2,
          widthM: dims.widthM,
          heightM: dims.heightM,
        };
      }
      return item;
    });

    const validatedList = updated.map((item) => {
      const v = validateEmergencySignNormative(item, updated, scaleMetersPerPx);
      return {
        ...item,
        isValidLocation: v.isValid,
        validationAlerts: v.alerts,
      };
    });

    set({ devices: validatedList });
  },

  clearEmergencyDevices: () => set({ devices: [] }),

  validateAll: (scaleMetersPerPx = 0.05) => {
    const current = get().devices;
    const validatedList = current.map((item) => {
      const v = validateEmergencySignNormative(item, current, scaleMetersPerPx);
      return {
        ...item,
        isValidLocation: v.isValid,
        validationAlerts: v.alerts,
      };
    });
    set({ devices: validatedList });
  },

  // ─── Persistencia bidireccional con estimate-store ────────────────────────

  /**
   * Reescribe las señales de emergencia del plano activo dentro de
   * config.devices (con emergencyData serializable), preservando el resto
   * de sistemas sembrados. Se invoca tras cada operación de siembra/edición.
   */
  syncEmergencyToFloorplanConfig: (devices, scaleMetersPerPx = 0.05) => {
    // Requiere el store de presupuesto para reescribir config.devices.
    // estimate-store NO importa este módulo en tiempo de ejecución de módulo,
    // por lo que no se crea un ciclo de dependencias.
    const mod = require('@/store/estimate-store') as {
      useEstimateStore: {
        getState: () => {
          floorplanConfig: any;
          setFloorplanConfig: (config: any) => void;
        };
      };
    };
    const store = mod.useEstimateStore.getState();
    const config = store.floorplanConfig;
    if (!config) return;

    const others = (config.devices || []).filter(
      (d: FloorplanDevice) => d.system !== 'emergency_exit'
    );
    const emergencyAsFloorplanDevices: FloorplanDevice[] = devices.map((dev) => ({
      id: dev.id,
      system: 'emergency_exit',
      subType: dev.subType || dev.category,
      x: Math.round(dev.x),
      y: Math.round(dev.y),
      verticalDropM: dev.mountingHeightM,
      emergencyData: {
        category: dev.category,
        exitType: dev.exitType,
        arrowDirection: dev.arrowDirection,
        arrowAngle: dev.arrowAngle,
        viewingDistanceM: dev.viewingDistanceM,
        mountingHeightM: dev.mountingHeightM,
        distFromCeilingM: dev.distFromCeilingM,
        illuminationLux: dev.illuminationLux,
        isPhotoluminescent: dev.isPhotoluminescent,
        material: dev.material,
        mountingType: dev.mountingType,
        unitCostMxn: dev.unitCostMxn,
        associatedRouteId: dev.associatedRouteId,
      },
    }));

    store.setFloorplanConfig({
      ...config,
      devices: [...others, ...emergencyAsFloorplanDevices],
    });

    // Revalidar con la escala vigente para mantener alertas normativas
    get().validateAll(scaleMetersPerPx);
  },

  /**
   * Hidratación desde datos persistidos (BD): reconstruye los dispositivos
   * NOM-026 del plano activo y los carga en el store volátil, revalidando
   * contra la escala actual. Es el equivalente a setExtinguishers() del
   * módulo de extintores.
   */
  hydrateFromFloorplanDevices: (devices, planoId, scaleMetersPerPx = 0.05) => {
    const hydrated = devices
      .map((d) => rebuildEmergencyDeviceFromFloorplan(d, planoId))
      .filter((d): d is EmergencySignDevice => d !== null);

    const validatedList = hydrated.map((item) => {
      const v = validateEmergencySignNormative(item, hydrated, scaleMetersPerPx);
      return {
        ...item,
        isValidLocation: v.isValid,
        validationAlerts: v.alerts,
      };
    });

    set({ devices: validatedList });
  },
}));
