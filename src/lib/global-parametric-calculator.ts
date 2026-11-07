import type { BuildingLevel, FloorplanItem, FloorplanDevice } from '@/store/estimate-store';
import type { ExtinguisherDevice, ExtinguisherType, ExtinguisherCapacity } from '@/types/fireProtection';
import type { EmergencySignDevice, NOM026SignCategory } from '@/types/emergencySignage';
import { EXTINGUISHER_CATALOG } from '@/lib/fireNormativeValidator';

export interface ExtinguisherParametricItem {
  sku: string;
  name: string;
  type: string;
  capacity: string;
  count: number;
  unitCost: number;
  totalAmount: number;
  medicalArea: string;
}

export interface EmergencyExitParametricItem {
  sku: string;
  name: string;
  category: NOM026SignCategory;
  material: string;
  count: number;
  unitCost: number;
  installCost: number;
  totalAmount: number;
  mountingType: string;
}

export interface ExtinguisherLevelBreakdown {
  levelId: string;
  levelName: string;
  levelCode: string;
  count: number;
  validCount: number;
  subtotalAmount: number;
  medicalAreas: string[];
  items: ExtinguisherParametricItem[];
}

export interface EmergencySignLevelBreakdown {
  levelId: string;
  levelName: string;
  levelCode: string;
  count: number;
  exitCount: number;
  routeCount: number;
  stairCount: number;
  safeZoneCount: number;
  firstAidCount: number;
  subtotalMaterials: number;
  subtotalInstall: number;
  subtotalAmount: number;
  validCount: number;
  compliancePercent: number;
  items: EmergencyExitParametricItem[];
}

export interface GlobalExtinguisherReportData {
  levelsBreakdown: ExtinguisherLevelBreakdown[];
  consolidatedItems: ExtinguisherParametricItem[];
  totalCount: number;
  validCount: number;
  subtotalAmount: number;
  ivaRate: number;
  ivaAmount: number;
  totalWithIva: number;
}

export interface GlobalEmergencyExitReportData {
  levelsBreakdown: EmergencySignLevelBreakdown[];
  consolidatedItems: EmergencyExitParametricItem[];
  totalCount: number;
  validCount: number;
  compliancePercent: number;
  subtotalMaterials: number;
  subtotalInstall: number;
  subtotalAmount: number;
  ivaRate: number;
  ivaAmount: number;
  totalWithIva: number;
}

export interface GlobalParametricsCalculationResult {
  extinguishers: GlobalExtinguisherReportData;
  emergencyExit: GlobalEmergencyExitReportData;
  grandTotalCombined: number;
  totalLevelsCount: number;
}

export const NOM026_CATEGORY_DETAILS: Record<
  NOM026SignCategory,
  { sku: string; name: string; unitCost: number; installCost: number }
> = {
  SALIDA_DE_EMERGENCIA: {
    sku: 'NOM026-EMG-EXIT',
    name: 'Señal Salida de Emergencia Directa',
    unitCost: 185.0,
    installCost: 65.0,
  },
  RUTA_DE_EVACUACION: {
    sku: 'NOM026-EMG-ROUTE',
    name: 'Señal Ruta de Evacuación (Direccional)',
    unitCost: 140.0,
    installCost: 55.0,
  },
  ESCALERA_DE_EMERGENCIA: {
    sku: 'NOM026-EMG-STAIR',
    name: 'Señal Escalera de Emergencia',
    unitCost: 165.0,
    installCost: 60.0,
  },
  ZONA_DE_SEGURIDAD: {
    sku: 'NOM026-EMG-SAFE',
    name: 'Señal Zona de Seguridad / Punto de Reunión',
    unitCost: 210.0,
    installCost: 85.0,
  },
  PRIMEROS_AUXILIOS: {
    sku: 'NOM026-EMG-AID',
    name: 'Señal Estación Primeros Auxilios',
    unitCost: 150.0,
    installCost: 55.0,
  },
};

/**
 * Resuelve el nivel asignado a un plano según su levelId o coincidencias por nombre/código
 */
export function resolveFloorplanLevelId(fp: FloorplanItem, buildingLevels: BuildingLevel[]): string {
  if (fp.levelId && buildingLevels.some((l) => l.id === fp.levelId)) {
    if (fp.levelId === 'level_pb') {
      const nameLower = String(fp.name || '').toLowerCase();
      for (const lvl of buildingLevels) {
        if (lvl.id === 'level_pb') continue;
        const codeLower = String(lvl.code || '').toLowerCase();
        const lvlNameLower = String(lvl.name || '').toLowerCase();
        if (
          (codeLower && nameLower.includes(codeLower)) ||
          (lvlNameLower && nameLower.includes(lvlNameLower))
        ) {
          return lvl.id;
        }
      }
    }
    return fp.levelId;
  }

  const nameLower = String(fp.name || '').toLowerCase();
  for (const lvl of buildingLevels) {
    const codeLower = String(lvl.code || '').toLowerCase();
    const lvlNameLower = String(lvl.name || '').toLowerCase();
    if (
      (codeLower && nameLower.includes(codeLower)) ||
      (lvlNameLower && nameLower.includes(lvlNameLower))
    ) {
      return lvl.id;
    }
  }

  return buildingLevels[0]?.id || 'level_pb';
}

/**
 * Infiere la categoría NOM-026 a partir de un FloorplanDevice o su subType
 */
export function inferEmergencyCategory(d: FloorplanDevice): NOM026SignCategory {
  const anyD = d as any;
  if (anyD.category && NOM026_CATEGORY_DETAILS[anyD.category as NOM026SignCategory]) {
    return anyD.category as NOM026SignCategory;
  }
  const st = String(d.subType || '').toUpperCase();
  if (st.includes('SALIDA') || st.includes('PUERTA')) return 'SALIDA_DE_EMERGENCIA';
  if (st.includes('ESCALERA')) return 'ESCALERA_DE_EMERGENCIA';
  if (st.includes('RUTA') || st.includes('FLECHA') || st.includes('EVACUA')) return 'RUTA_DE_EVACUACION';
  if (st.includes('ZONA') || st.includes('SEGURIDAD') || st.includes('REUNION') || st.includes('REUNIÓN')) return 'ZONA_DE_SEGURIDAD';
  if (st.includes('PRIMEROS') || st.includes('AUXILIO') || st.includes('BOTIQUIN') || st.includes('BOTIQUÍN')) return 'PRIMEROS_AUXILIOS';
  return 'RUTA_DE_EVACUACION';
}

/**
 * Normaliza SKU para búsquedas elásticas
 */
const normSku = (s: string) => s.toUpperCase().replace(/\.0/g, '').replace(/[^A-Z0-9]/g, '');

/**
 * Busca el precio de un extintor en el catálogo o en la base de datos de precios
 */
export function resolveExtinguisherPrice(
  type: string,
  capacity: string,
  dbPrices: any[] = []
): { sku: string; name: string; unitCost: number } {
  const staticMatch =
    EXTINGUISHER_CATALOG.find((cat) => cat.type === type && cat.capacity === capacity) ||
    EXTINGUISHER_CATALOG.find((cat) => cat.type === type);

  const targetSku = staticMatch ? staticMatch.sku : `EXT-${type}-${capacity}`;

  const livePriceDbItem = (dbPrices || []).find((p) => {
    if (p.active === false) return false;
    const pSkuNorm = normSku(p.sku || '');
    const targetSkuNorm = normSku(targetSku);
    if (pSkuNorm === targetSkuNorm) return true;

    const pDescNorm = normSku(p.description || '');
    const itemTypeNorm = normSku(type);
    const capNorm = normSku(capacity);
    return (
      (p.system === 'EXTINTOR' || p.system === 'INCENDIO') &&
      (pSkuNorm.includes(capNorm) || pDescNorm.includes(capNorm)) &&
      (pSkuNorm.includes(itemTypeNorm) || pDescNorm.includes(itemTypeNorm))
    );
  });

  const unitCost = livePriceDbItem
    ? Number(livePriceDbItem.unitCost)
    : staticMatch
      ? staticMatch.unitCost
      : 2500.0;

  const sku = livePriceDbItem ? livePriceDbItem.sku : targetSku;
  const name = livePriceDbItem
    ? livePriceDbItem.description
    : staticMatch
      ? staticMatch.name
      : `Extintor ${type} ${capacity}`;

  return { sku, name, unitCost };
}

/**
 * Motor Aritmético Central de Cálculo Paramétrico Global
 * Procesa todos los pisos/niveles del edificio, realizando sumas, agrupaciones y procesos financieros.
 */
export function calculateGlobalParametrics({
  buildingLevels,
  floorplans,
  activeFloorplanId,
  activeExtinguishers = [],
  activeEmergencyDevices = [],
  dbPrices = [],
  ivaRate = 0.16,
}: {
  buildingLevels: BuildingLevel[];
  floorplans: FloorplanItem[];
  activeFloorplanId?: string;
  activeExtinguishers?: ExtinguisherDevice[];
  activeEmergencyDevices?: EmergencySignDevice[];
  dbPrices?: any[];
  ivaRate?: number;
}): GlobalParametricsCalculationResult {
  const safeLevels = buildingLevels && buildingLevels.length > 0 ? buildingLevels : [
    { id: 'level_pb', name: 'Planta Baja (PB)', code: 'PB', order: 1 }
  ];

  const extinguisherLevelsBreakdown: ExtinguisherLevelBreakdown[] = [];
  const emergencyLevelsBreakdown: EmergencySignLevelBreakdown[] = [];

  // Mapas consolidados globales
  const globalExtinguisherMap = new Map<
    string,
    {
      sku: string;
      name: string;
      type: string;
      capacity: string;
      count: number;
      unitCost: number;
      medicalAreas: Set<string>;
    }
  >();

  const globalEmergencyMap: Record<
    NOM026SignCategory,
    { count: number; materials: Set<string>; mountings: Set<string> }
  > = {
    SALIDA_DE_EMERGENCIA: { count: 0, materials: new Set(), mountings: new Set() },
    RUTA_DE_EVACUACION: { count: 0, materials: new Set(), mountings: new Set() },
    ESCALERA_DE_EMERGENCIA: { count: 0, materials: new Set(), mountings: new Set() },
    ZONA_DE_SEGURIDAD: { count: 0, materials: new Set(), mountings: new Set() },
    PRIMEROS_AUXILIOS: { count: 0, materials: new Set(), mountings: new Set() },
  };

  let globalExtinguisherTotalCount = 0;
  let globalExtinguisherValidCount = 0;

  let globalEmergencyTotalCount = 0;
  let globalEmergencyValidCount = 0;

  // Iterar por cada nivel del edificio
  safeLevels.forEach((lvl) => {
    const levelFloorplans = (floorplans || []).filter(
      (fp) => resolveFloorplanLevelId(fp, safeLevels) === lvl.id
    );

    // ─────────────────────────────────────────────────────────────
    // 1. CÁLCULO DE EXTINTORES PARA ESTE NIVEL
    // ─────────────────────────────────────────────────────────────
    const levelExtBreakdownMap = new Map<
      string,
      {
        type: string;
        capacity: string;
        count: number;
        medicalArea: string;
      }
    >();

    const levelMedicalAreas = new Set<string>();
    let levelExtCount = 0;
    let levelExtValid = 0;

    levelFloorplans.forEach((fp) => {
      // Si este plano es el activo y hay extintores en memoria en activeExtinguishers, usarlos
      const isCurrentActive = fp.id === activeFloorplanId;
      const extDevices = isCurrentActive && activeExtinguishers.length > 0
        ? activeExtinguishers
        : (fp.devices || [])
            .filter((d) => d.system === 'extinguisher')
            .map((d) => {
              const extData = d.extinguisherData;
              let parsedType = extData?.type || 'CO2';
              if (!extData?.type && d.subType) {
                const st = d.subType.toUpperCase();
                if (st.includes('PQS')) parsedType = 'PQS_ABC';
                else if (st.includes('CO2')) parsedType = 'CO2';
                else if (st.includes('CLEAN') || st.includes('SOLKAFLAM')) parsedType = 'CLEAN_AGENT';
                else if (st.includes('CLASS_K') || st.includes('ACETATO')) parsedType = 'CLASS_K';
                else if (st.includes('WATER') || st.includes('AGUA')) parsedType = 'WATER_PRESSURIZED';
              }
              const subTypeParts = (d.subType || '').split(' ');
              const parsedCap = extData?.capacity || subTypeParts[1] || '5lbs';
              return {
                id: d.id,
                type: parsedType,
                capacity: parsedCap,
                medicalArea: extData?.medicalArea || 'pasillo',
                isValidLocation: true,
              };
            });

      extDevices.forEach((dev) => {
        levelExtCount += 1;
        if ((dev as any).isValidLocation !== false) {
          levelExtValid += 1;
        }

        const mArea = dev.medicalArea || 'pasillo';
        levelMedicalAreas.add(mArea);

        const key = `${dev.type}_${dev.capacity}`;
        const existing = levelExtBreakdownMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          levelExtBreakdownMap.set(key, {
            type: dev.type,
            capacity: dev.capacity,
            count: 1,
            medicalArea: mArea,
          });
        }

        // Acumular en el mapa global
        const globalExisting = globalExtinguisherMap.get(key);
        if (globalExisting) {
          globalExisting.count += 1;
          globalExisting.medicalAreas.add(mArea);
        } else {
          const priceInfo = resolveExtinguisherPrice(dev.type, dev.capacity, dbPrices);
          globalExtinguisherMap.set(key, {
            sku: priceInfo.sku,
            name: priceInfo.name,
            type: dev.type,
            capacity: dev.capacity,
            count: 1,
            unitCost: priceInfo.unitCost,
            medicalAreas: new Set([mArea]),
          });
        }
      });
    });

    globalExtinguisherTotalCount += levelExtCount;
    globalExtinguisherValidCount += levelExtValid;

    // Generar items con precio para este nivel
    let levelExtSubtotal = 0;
    const levelExtItems: ExtinguisherParametricItem[] = Array.from(levelExtBreakdownMap.values()).map(
      (item) => {
        const priceInfo = resolveExtinguisherPrice(item.type, item.capacity, dbPrices);
        const totalAmount = priceInfo.unitCost * item.count;
        levelExtSubtotal += totalAmount;
        return {
          sku: priceInfo.sku,
          name: priceInfo.name,
          type: item.type,
          capacity: item.capacity,
          count: item.count,
          unitCost: priceInfo.unitCost,
          totalAmount,
          medicalArea: item.medicalArea,
        };
      }
    );

    extinguisherLevelsBreakdown.push({
      levelId: lvl.id,
      levelName: lvl.name,
      levelCode: lvl.code,
      count: levelExtCount,
      validCount: levelExtValid,
      subtotalAmount: levelExtSubtotal,
      medicalAreas: Array.from(levelMedicalAreas),
      items: levelExtItems,
    });

    // ─────────────────────────────────────────────────────────────
    // 2. CÁLCULO DE SEÑALIZACIÓN NOM-026 PARA ESTE NIVEL
    // ─────────────────────────────────────────────────────────────
    const levelEmgCounts: Record<
      NOM026SignCategory,
      { count: number; materials: Set<string>; mountings: Set<string> }
    > = {
      SALIDA_DE_EMERGENCIA: { count: 0, materials: new Set(), mountings: new Set() },
      RUTA_DE_EVACUACION: { count: 0, materials: new Set(), mountings: new Set() },
      ESCALERA_DE_EMERGENCIA: { count: 0, materials: new Set(), mountings: new Set() },
      ZONA_DE_SEGURIDAD: { count: 0, materials: new Set(), mountings: new Set() },
      PRIMEROS_AUXILIOS: { count: 0, materials: new Set(), mountings: new Set() },
    };

    let levelEmgTotal = 0;
    let levelEmgValid = 0;

    levelFloorplans.forEach((fp) => {
      const isCurrentActive = fp.id === activeFloorplanId;
      const emgDevices = isCurrentActive && activeEmergencyDevices.length > 0
        ? activeEmergencyDevices
        : (fp.devices || [])
            .filter((d) => d.system === 'emergency_exit')
            .map((d) => {
              const cat = inferEmergencyCategory(d);
              return {
                id: d.id,
                category: cat,
                material: (d as any).material || 'ACRILICO_FOTOLUMINISCENTE',
                mountingType: (d as any).mountingType || 'SOBRE_PUERTA',
                isValidLocation: true,
              };
            });

      emgDevices.forEach((dev) => {
        const cat = (dev.category as NOM026SignCategory) || 'RUTA_DE_EVACUACION';
        if (levelEmgCounts[cat]) {
          levelEmgTotal += 1;
          if ((dev as any).isValidLocation !== false) {
            levelEmgValid += 1;
          }

          levelEmgCounts[cat].count += 1;
          if (dev.material) levelEmgCounts[cat].materials.add(dev.material);
          if (dev.mountingType) levelEmgCounts[cat].mountings.add(dev.mountingType);

          // Acumulador global
          globalEmergencyMap[cat].count += 1;
          if (dev.material) globalEmergencyMap[cat].materials.add(dev.material);
          if (dev.mountingType) globalEmergencyMap[cat].mountings.add(dev.mountingType);
        }
      });
    });

    globalEmergencyTotalCount += levelEmgTotal;
    globalEmergencyValidCount += levelEmgValid;

    let levelMatSubtotal = 0;
    let levelInstSubtotal = 0;
    const levelEmgItems: EmergencyExitParametricItem[] = (
      Object.keys(levelEmgCounts) as NOM026SignCategory[]
    )
      .filter((cat) => levelEmgCounts[cat].count > 0)
      .map((cat) => {
        const info = NOM026_CATEGORY_DETAILS[cat];
        const count = levelEmgCounts[cat].count;
        const mat = Array.from(levelEmgCounts[cat].materials)[0] || 'ACRILICO_FOTOLUMINISCENTE';
        const mnt = Array.from(levelEmgCounts[cat].mountings)[0] || 'SOBRE_PUERTA';
        const matCost = count * info.unitCost;
        const instCost = count * info.installCost;
        levelMatSubtotal += matCost;
        levelInstSubtotal += instCost;
        return {
          sku: info.sku,
          name: info.name,
          category: cat,
          material: mat,
          count,
          unitCost: info.unitCost,
          installCost: info.installCost,
          totalAmount: matCost + instCost,
          mountingType: mnt,
        };
      });

    const levelEmgSubtotal = levelMatSubtotal + levelInstSubtotal;
    const levelCompliancePercent =
      levelEmgTotal > 0 ? Math.round((levelEmgValid / levelEmgTotal) * 100) : 100;

    emergencyLevelsBreakdown.push({
      levelId: lvl.id,
      levelName: lvl.name,
      levelCode: lvl.code,
      count: levelEmgTotal,
      exitCount: levelEmgCounts.SALIDA_DE_EMERGENCIA.count,
      routeCount: levelEmgCounts.RUTA_DE_EVACUACION.count,
      stairCount: levelEmgCounts.ESCALERA_DE_EMERGENCIA.count,
      safeZoneCount: levelEmgCounts.ZONA_DE_SEGURIDAD.count,
      firstAidCount: levelEmgCounts.PRIMEROS_AUXILIOS.count,
      subtotalMaterials: levelMatSubtotal,
      subtotalInstall: levelInstSubtotal,
      subtotalAmount: levelEmgSubtotal,
      validCount: levelEmgValid,
      compliancePercent: levelCompliancePercent,
      items: levelEmgItems,
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. CONSOLIDACIÓN GLOBAL ARITMÉTICA
  // ─────────────────────────────────────────────────────────────

  // A. Extintores Global
  const consolidatedExtItems: ExtinguisherParametricItem[] = Array.from(
    globalExtinguisherMap.values()
  ).map((item) => {
    const totalAmount = item.unitCost * item.count;
    const medAreasArr = Array.from(item.medicalAreas);
    return {
      sku: item.sku,
      name: item.name,
      type: item.type,
      capacity: item.capacity,
      count: item.count,
      unitCost: item.unitCost,
      totalAmount,
      medicalArea: medAreasArr.join(', ') || 'General',
    };
  });

  const extSubtotalAmount = consolidatedExtItems.reduce((sum, item) => sum + item.totalAmount, 0);
  const extIvaAmount = extSubtotalAmount * ivaRate;
  const extTotalWithIva = extSubtotalAmount + extIvaAmount;

  // B. Señalización NOM-026 Global
  let emgSubtotalMaterials = 0;
  let emgSubtotalInstall = 0;

  const consolidatedEmgItems: EmergencyExitParametricItem[] = (
    Object.keys(globalEmergencyMap) as NOM026SignCategory[]
  )
    .filter((cat) => globalEmergencyMap[cat].count > 0)
    .map((cat) => {
      const info = NOM026_CATEGORY_DETAILS[cat];
      const count = globalEmergencyMap[cat].count;
      const mat = Array.from(globalEmergencyMap[cat].materials)[0] || 'ACRILICO_FOTOLUMINISCENTE';
      const mnt = Array.from(globalEmergencyMap[cat].mountings)[0] || 'SOBRE_PUERTA';
      const matCost = count * info.unitCost;
      const instCost = count * info.installCost;
      emgSubtotalMaterials += matCost;
      emgSubtotalInstall += instCost;
      return {
        sku: info.sku,
        name: info.name,
        category: cat,
        material: mat,
        count,
        unitCost: info.unitCost,
        installCost: info.installCost,
        totalAmount: matCost + instCost,
        mountingType: mnt,
      };
    });

  const emgSubtotalAmount = emgSubtotalMaterials + emgSubtotalInstall;
  const emgIvaAmount = emgSubtotalAmount * ivaRate;
  const emgTotalWithIva = emgSubtotalAmount + emgIvaAmount;
  const emgCompliancePercent =
    globalEmergencyTotalCount > 0
      ? Math.round((globalEmergencyValidCount / globalEmergencyTotalCount) * 100)
      : 100;

  const grandTotalCombined = extTotalWithIva + emgTotalWithIva;

  return {
    extinguishers: {
      levelsBreakdown: extinguisherLevelsBreakdown,
      consolidatedItems: consolidatedExtItems,
      totalCount: globalExtinguisherTotalCount,
      validCount: globalExtinguisherValidCount,
      subtotalAmount: extSubtotalAmount,
      ivaRate,
      ivaAmount: extIvaAmount,
      totalWithIva: extTotalWithIva,
    },
    emergencyExit: {
      levelsBreakdown: emergencyLevelsBreakdown,
      consolidatedItems: consolidatedEmgItems,
      totalCount: globalEmergencyTotalCount,
      validCount: globalEmergencyValidCount,
      compliancePercent: emgCompliancePercent,
      subtotalMaterials: emgSubtotalMaterials,
      subtotalInstall: emgSubtotalInstall,
      subtotalAmount: emgSubtotalAmount,
      ivaRate,
      ivaAmount: emgIvaAmount,
      totalWithIva: emgTotalWithIva,
    },
    grandTotalCombined,
    totalLevelsCount: safeLevels.length,
  };
}
