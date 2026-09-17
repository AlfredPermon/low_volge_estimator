import { create } from 'zustand';
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
}));
