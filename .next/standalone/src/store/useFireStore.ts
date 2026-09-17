import { create } from 'zustand';
import {
  ExtinguisherDevice,
  ExtinguisherType,
  ExtinguisherCapacity,
  HospitalRiskZone,
} from '@/types/fireProtection';
import {
  validateExtinguisherNormative,
  MEDICAL_AREAS,
} from '@/lib/fireNormativeValidator';

interface FireStoreState {
  // Layer & View state
  activeLayer: 'EXTINGUISHER_SEED' | 'FIRE_ALARM' | 'ALL';
  showCoverageRadii: boolean;
  radiusDisplayMode: 'EFFECTIVE_2D' | 'MAX_TRAVEL_NOM';

  // Selected tool parameters
  selectedType: ExtinguisherType;
  selectedCapacity: ExtinguisherCapacity;
  selectedRiskZone: HospitalRiskZone;
  selectedMedicalArea: string;
  mountingHeightDefault: number;
  signalingHeightDefault: number;
  hasSignalingDefault: boolean;

  // Collection of extinguishers placed in canvas
  extinguishers: ExtinguisherDevice[];

  // Actions
  setActiveLayer: (layer: 'EXTINGUISHER_SEED' | 'FIRE_ALARM' | 'ALL') => void;
  setShowCoverageRadii: (show: boolean) => void;
  toggleShowCoverageRadii: () => void;
  setRadiusDisplayMode: (mode: 'EFFECTIVE_2D' | 'MAX_TRAVEL_NOM') => void;
  setSelectedType: (type: ExtinguisherType) => void;
  setSelectedCapacity: (capacity: ExtinguisherCapacity) => void;
  setSelectedRiskZone: (zone: HospitalRiskZone) => void;
  setSelectedMedicalArea: (areaKey: string) => void;
  setMountingHeightDefault: (h: number) => void;
  setSignalingHeightDefault: (h: number) => void;
  setHasSignalingDefault: (flag: boolean) => void;

  setExtinguishers: (extinguishers: ExtinguisherDevice[]) => void;
  addExtinguisher: (
    device: Omit<ExtinguisherDevice, 'id' | 'isValidLocation' | 'validationAlerts' | 'coverageRadiusMeters'> & { id?: string },
    scaleMetersPerPx?: number
  ) => ExtinguisherDevice;
  removeExtinguisher: (id: string, scaleMetersPerPx?: number) => void;
  updateExtinguisher: (id: string, patch: Partial<ExtinguisherDevice>, scaleMetersPerPx?: number) => void;
  clearExtinguishers: () => void;
  validateAll: (scaleMetersPerPx?: number) => void;
}

export const useFireStore = create<FireStoreState>((set, get) => ({
  activeLayer: 'EXTINGUISHER_SEED',
  showCoverageRadii: true,
  radiusDisplayMode: 'EFFECTIVE_2D',

  selectedType: 'CO2',
  selectedCapacity: '5lbs',
  selectedRiskZone: 'HIGH_RISK',
  selectedMedicalArea: 'quirofano',
  mountingHeightDefault: 1.50,
  signalingHeightDefault: 1.90,
  hasSignalingDefault: true,

  extinguishers: [],

  setActiveLayer: (activeLayer) => set({ activeLayer }),
  setShowCoverageRadii: (showCoverageRadii) => set({ showCoverageRadii }),
  toggleShowCoverageRadii: () => set((state) => ({ showCoverageRadii: !state.showCoverageRadii })),
  setRadiusDisplayMode: (radiusDisplayMode) => set({ radiusDisplayMode }),

  setSelectedType: (selectedType) => set({ selectedType }),
  setSelectedCapacity: (selectedCapacity) => set({ selectedCapacity }),
  setSelectedRiskZone: (selectedRiskZone) => set({ selectedRiskZone }),
  setSelectedMedicalArea: (areaKey) => {
    const area = MEDICAL_AREAS[areaKey] || MEDICAL_AREAS.pasillo;
    set({
      selectedMedicalArea: areaKey,
      selectedRiskZone: area.riskZone,
      selectedType: area.recommendedType,
    });
  },
  setMountingHeightDefault: (mountingHeightDefault) => set({ mountingHeightDefault }),
  setSignalingHeightDefault: (signalingHeightDefault) => set({ signalingHeightDefault }),
  setHasSignalingDefault: (hasSignalingDefault) => set({ hasSignalingDefault }),

  setExtinguishers: (extinguishers) => set({ extinguishers }),

  addExtinguisher: (data, scaleMetersPerPx = 0.05) => {
    const radiusM = data.riskZone === 'HIGH_RISK' ? 15.0 : 30.0;
    const newDevice: ExtinguisherDevice = {
      ...data,
      id: data.id || `ext_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      coverageRadiusMeters: radiusM,
      isValidLocation: true,
      validationAlerts: [],
    };

    const current = get().extinguishers;
    const updated = [...current.filter((d) => d.id !== newDevice.id), newDevice];

    // Recalculate validation for all using scaleMetersPerPx
    const validatedList = updated.map((item) => {
      const v = validateExtinguisherNormative(item, updated, scaleMetersPerPx);
      return {
        ...item,
        isValidLocation: v.isValid,
        validationAlerts: v.alerts,
      };
    });

    set({ extinguishers: validatedList });
    return validatedList.find((d) => d.id === newDevice.id) || newDevice;
  },

  removeExtinguisher: (id, scaleMetersPerPx = 0.05) => {
    const updated = get().extinguishers.filter((d) => d.id !== id);
    const validatedList = updated.map((item) => {
      const v = validateExtinguisherNormative(item, updated, scaleMetersPerPx);
      return {
        ...item,
        isValidLocation: v.isValid,
        validationAlerts: v.alerts,
      };
    });
    set({ extinguishers: validatedList });
  },

  updateExtinguisher: (id, patch, scaleMetersPerPx = 0.05) => {
    const current = get().extinguishers;
    const updated = current.map((item) => {
      if (item.id === id) {
        const radiusM = (patch.riskZone || item.riskZone) === 'HIGH_RISK' ? 15.0 : 30.0;
        return {
          ...item,
          ...patch,
          coverageRadiusMeters: radiusM,
        };
      }
      return item;
    });

    const validatedList = updated.map((item) => {
      const v = validateExtinguisherNormative(item, updated, scaleMetersPerPx);
      return {
        ...item,
        isValidLocation: v.isValid,
        validationAlerts: v.alerts,
      };
    });

    set({ extinguishers: validatedList });
  },

  clearExtinguishers: () => set({ extinguishers: [] }),

  validateAll: (scaleMetersPerPx = 0.05) => {
    const current = get().extinguishers;
    const validatedList = current.map((item) => {
      const v = validateExtinguisherNormative(item, current, scaleMetersPerPx);
      return {
        ...item,
        isValidLocation: v.isValid,
        validationAlerts: v.alerts,
      };
    });
    set({ extinguishers: validatedList });
  },
}));
