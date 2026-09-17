import {
  ExtinguisherDevice,
  ExtinguisherType,
  ExtinguisherCapacity,
  HospitalRiskZone,
} from '@/types/fireProtection';

export interface MedicalAreaNormative {
  id: string;
  name: string;
  riskZone: HospitalRiskZone;
  allowedTypes: ExtinguisherType[];
  recommendedType: ExtinguisherType;
  forbiddenTypes: ExtinguisherType[];
  normativeReference: string; // ej. NOM-016-SSA3-2012 / NOM-002-STPS-2010
  description: string;
}

export const MEDICAL_AREAS: Record<string, MedicalAreaNormative> = {
  quirofano: {
    id: 'quirofano',
    name: 'Quirófano / Sala de Cirugía',
    riskZone: 'HIGH_RISK',
    allowedTypes: ['CO2'],
    recommendedType: 'CO2',
    forbiddenTypes: ['PQS_ABC', 'WATER_PRESSURIZED', 'CLASS_K'],
    normativeReference: 'NOM-016-SSA3-2012 Num. 6.1.2 & NOM-002-STPS-2010',
    description: 'Área estéril quirúrgica. Exclusivo CO2 para evitar contaminación de anestesia o campo estéril.',
  },
  uci: {
    id: 'uci',
    name: 'Unidad de Cuidados Intensivos (UCI)',
    riskZone: 'HIGH_RISK',
    allowedTypes: ['CO2', 'CLEAN_AGENT'],
    recommendedType: 'CO2',
    forbiddenTypes: ['PQS_ABC', 'WATER_PRESSURIZED', 'CLASS_K'],
    normativeReference: 'NOM-016-SSA3-2012 Num. 6.2.1',
    description: 'Pacientes en estado crítico. Prohibido PQS por partículas volátiles corrosivas.',
  },
  expulsion: {
    id: 'expulsion',
    name: 'Salas de Expulsión / Toco-Cirugía',
    riskZone: 'HIGH_RISK',
    allowedTypes: ['CO2'],
    recommendedType: 'CO2',
    forbiddenTypes: ['PQS_ABC', 'WATER_PRESSURIZED', 'CLASS_K'],
    normativeReference: 'NOM-016-SSA3-2012 Num. 6.1.4',
    description: 'Área obstétrica estéril. Solo dióxido de carbono inerte sin residuos.',
  },
  ceye: {
    id: 'ceye',
    name: 'CEYE (Central de Equipos y Esterilización)',
    riskZone: 'HIGH_RISK',
    allowedTypes: ['CLEAN_AGENT', 'CO2'],
    recommendedType: 'CLEAN_AGENT',
    forbiddenTypes: ['PQS_ABC', 'WATER_PRESSURIZED'],
    normativeReference: 'NOM-016-SSA3-2012 Num. 6.3.5',
    description: 'Instrumental médico estéril y autoclaves. Agente Limpio HFC-236fa / Solkaflam.',
  },
  laboratorio: {
    id: 'laboratorio',
    name: 'Laboratorio de Análisis Clínicos',
    riskZone: 'HIGH_RISK',
    allowedTypes: ['CLEAN_AGENT', 'CO2'],
    recommendedType: 'CLEAN_AGENT',
    forbiddenTypes: ['PQS_ABC', 'WATER_PRESSURIZED'],
    normativeReference: 'NOM-016-SSA3-2012 Num. 6.4.1',
    description: 'Reactivos químicos y centrífugas. Agente Limpio evita residuos y choque térmico.',
  },
  farmacia: {
    id: 'farmacia',
    name: 'Farmacia / Almacén de Medicamentos',
    riskZone: 'HIGH_RISK',
    allowedTypes: ['CLEAN_AGENT', 'CO2'],
    recommendedType: 'CLEAN_AGENT',
    forbiddenTypes: ['PQS_ABC', 'WATER_PRESSURIZED'],
    normativeReference: 'NOM-016-SSA3-2012 Num. 6.4.8',
    description: 'Medicamentos y biológicos. Agente Limpio no contamina insumos farmacéuticos.',
  },
  datacenter: {
    id: 'datacenter',
    name: 'Data Center / Cuarto de Servidores / Conmutador',
    riskZone: 'HIGH_RISK',
    allowedTypes: ['CLEAN_AGENT', 'CO2'],
    recommendedType: 'CLEAN_AGENT',
    forbiddenTypes: ['PQS_ABC', 'WATER_PRESSURIZED'],
    normativeReference: 'NOM-002-STPS-2010 & NFPA 75',
    description: 'Equipos electrónicos críticos. Agente Limpio dieléctrico sin residuos.',
  },
  cocina: {
    id: 'cocina',
    name: 'Cocina Hospitalaria / Dietología',
    riskZone: 'HIGH_RISK',
    allowedTypes: ['CLASS_K'],
    recommendedType: 'CLASS_K',
    forbiddenTypes: ['WATER_PRESSURIZED', 'CO2'],
    normativeReference: 'NOM-002-STPS-2010 Num. 7.2 & NFPA 10',
    description: 'Fuegos de grasas vegetales y mantecas. Obligatorio Acetato de Potasio Clase K (6L).',
  },
  lavanderia: {
    id: 'lavanderia',
    name: 'Lavandería y Ropería',
    riskZone: 'HIGH_RISK',
    allowedTypes: ['PQS_ABC', 'WATER_PRESSURIZED'],
    recommendedType: 'PQS_ABC',
    forbiddenTypes: [],
    normativeReference: 'NOM-002-STPS-2010',
    description: 'Alto volumen de textiles y pelusa combustible.',
  },
  subestacion: {
    id: 'subestacion',
    name: 'Subestación Eléctrica / Planta de Emergencia',
    riskZone: 'HIGH_RISK',
    allowedTypes: ['CO2', 'CLEAN_AGENT'],
    recommendedType: 'CO2',
    forbiddenTypes: ['WATER_PRESSURIZED'],
    normativeReference: 'NOM-002-STPS-2010 Num. 7.3',
    description: 'Fuegos eléctricos Clase C. Prohibido extintores base agua.',
  },
  pasillo: {
    id: 'pasillo',
    name: 'Pasillos Generales y Transición',
    riskZone: 'ORDINARY_RISK',
    allowedTypes: ['PQS_ABC', 'WATER_PRESSURIZED', 'CO2', 'CLEAN_AGENT'],
    recommendedType: 'PQS_ABC',
    forbiddenTypes: [],
    normativeReference: 'NOM-002-STPS-2010 Num. 7.1',
    description: 'Tránsito general. PQS ABC 6kg o Agua Presurizada 9L a distancia máx de 30m.',
  },
  oficinas: {
    id: 'oficinas',
    name: 'Oficinas Administrativas / Consulta Externa',
    riskZone: 'ORDINARY_RISK',
    allowedTypes: ['PQS_ABC', 'WATER_PRESSURIZED', 'CO2', 'CLEAN_AGENT'],
    recommendedType: 'PQS_ABC',
    forbiddenTypes: [],
    normativeReference: 'NOM-002-STPS-2010 Num. 7.1',
    description: 'Riesgo ordinario. Extintor multipropósito ABC o Agua Presurizada.',
  },
  espera: {
    id: 'espera',
    name: 'Salas de Espera / Recepción',
    riskZone: 'ORDINARY_RISK',
    allowedTypes: ['PQS_ABC', 'WATER_PRESSURIZED', 'CO2', 'CLEAN_AGENT'],
    recommendedType: 'PQS_ABC',
    forbiddenTypes: [],
    normativeReference: 'NOM-002-STPS-2010 Num. 7.1',
    description: 'Zonas públicas de riesgo ordinario. Cobertura máxima 30m.',
  },
};

// ─── Commercial Predefined Catalog ──────────────────────────────────────────

export interface CommercialExtinguisherItem {
  sku: string;
  type: ExtinguisherType;
  capacity: ExtinguisherCapacity;
  name: string;
  agent: string;
  fireClasses: string;
  unitCost: number; // MXN
  normative: string;
  includesWallBracket: boolean;
}

export const EXTINGUISHER_CATALOG: CommercialExtinguisherItem[] = [
  {
    sku: 'EXT-CO2-5LBS',
    type: 'CO2',
    capacity: '5lbs',
    name: 'Extintor de Dióxido de Carbono (CO2) 5 lbs',
    agent: 'CO2 Gas Inerte Dieléctrico',
    fireClasses: 'B, C',
    unitCost: 3250.0,
    normative: 'NOM-102-STPS-1994 / NOM-016-SSA3-2012',
    includesWallBracket: true,
  },
  {
    sku: 'EXT-CO2-10LBS',
    type: 'CO2',
    capacity: '10lbs',
    name: 'Extintor de Dióxido de Carbono (CO2) 10 lbs',
    agent: 'CO2 Gas Inerte Dieléctrico',
    fireClasses: 'B, C',
    unitCost: 4850.0,
    normative: 'NOM-102-STPS-1994 / NOM-016-SSA3-2012',
    includesWallBracket: true,
  },
  {
    sku: 'EXT-CLEAN-4.5KG',
    type: 'CLEAN_AGENT',
    capacity: '4.5kg',
    name: 'Extintor Agente Limpio HFC-236fa (Solkaflam) 4.5 kg',
    agent: 'HFC-236fa Gas Limpio no corrosivo',
    fireClasses: 'A, B, C',
    unitCost: 5900.0,
    normative: 'NOM-104-STPS-2001 / NOM-016-SSA3-2012',
    includesWallBracket: true,
  },
  {
    sku: 'EXT-CLEAN-6.0KG',
    type: 'CLEAN_AGENT',
    capacity: '6.0kg',
    name: 'Extintor Agente Limpio HFC-236fa (Solkaflam) 6.0 kg',
    agent: 'HFC-236fa Gas Limpio no corrosivo',
    fireClasses: 'A, B, C',
    unitCost: 7400.0,
    normative: 'NOM-104-STPS-2001 / NOM-016-SSA3-2012',
    includesWallBracket: true,
  },
  {
    sku: 'EXT-PQS-6.0KG',
    type: 'PQS_ABC',
    capacity: '6.0kg',
    name: 'Extintor de Polvo Químico Seco (PQS ABC) 6.0 kg',
    agent: 'Fosfato Monoamónico 75%',
    fireClasses: 'A, B, C',
    unitCost: 1450.0,
    normative: 'NOM-100-STPS-1994 / NOM-002-STPS-2010',
    includesWallBracket: true,
  },
  {
    sku: 'EXT-PQS-9.0KG',
    type: 'PQS_ABC',
    capacity: '9.0kg',
    name: 'Extintor de Polvo Químico Seco (PQS ABC) 9.0 kg',
    agent: 'Fosfato Monoamónico 75%',
    fireClasses: 'A, B, C',
    unitCost: 1950.0,
    normative: 'NOM-100-STPS-1994 / NOM-002-STPS-2010',
    includesWallBracket: true,
  },
  {
    sku: 'EXT-WATER-9.0L',
    type: 'WATER_PRESSURIZED',
    capacity: '9.0kg',
    name: 'Extintor de Agua Presurizada 9.0 L (Acero Inoxidable)',
    agent: 'Agua Desmineralizada con Presión',
    fireClasses: 'A',
    unitCost: 2600.0,
    normative: 'NOM-103-STPS-1994',
    includesWallBracket: true,
  },
  {
    sku: 'EXT-CLASSK-6L',
    type: 'CLASS_K',
    capacity: '6L',
    name: 'Extintor Clase K Acetato de Potasio 6.0 Litros',
    agent: 'Solución Acuosa Acetato de Potasio',
    fireClasses: 'K',
    unitCost: 5200.0,
    normative: 'NOM-002-STPS-2010 / NFPA 10',
    includesWallBracket: true,
  },
];

// ─── Normative Validation Engine ─────────────────────────────────────────────

export interface NormativeValidationResult {
  isValid: boolean;
  alerts: string[];
  medicalAreaName?: string;
  recommendedType?: ExtinguisherType;
  maxDistanceMeters: number;
  nearestExtinguisherDistanceMeters?: number;
}

/**
 * Validates an extinguisher device against Mexican NOMs
 */
export function validateExtinguisherNormative(
  device: ExtinguisherDevice,
  allDevices: ExtinguisherDevice[],
  scaleMetersPerPx: number = 0.05
): NormativeValidationResult {
  const alerts: string[] = [];
  let isValid = true;

  const areaKey = (device.medicalArea || '').toLowerCase();
  const areaConfig = MEDICAL_AREAS[areaKey] || MEDICAL_AREAS.pasillo;

  // 1. Validar compatibilidad de agente químico con área médica (NOM-016-SSA3-2012)
  if (areaConfig.forbiddenTypes.includes(device.type)) {
    isValid = false;
    alerts.push(
      `⛔ INCOMPATIBILIDAD CRÍTICA (NOM-016-SSA3-2012): Extintor tipo ${device.type} ESTÁ PROHIBIDO en "${areaConfig.name}". Tipo requerido: ${areaConfig.recommendedType}.`
    );
  } else if (!areaConfig.allowedTypes.includes(device.type)) {
    isValid = false;
    alerts.push(
      `⚠️ NO RECOMENDADO (NOM-016-SSA3-2012): En "${areaConfig.name}" se recomienda extintor tipo ${areaConfig.recommendedType}.`
    );
  }

  // 2. Altura de montaje (NOM-002-STPS-2010 Num. 7.1)
  if (device.mountingHeight > 1.50) {
    isValid = false;
    alerts.push(
      `⚠️ ALTURA EXCEDIDA (NOM-002-STPS-2010): Altura de montaje (${device.mountingHeight.toFixed(
        2
      )}m) excede el máximo permitido de 1.50m sobre piso terminado.`
    );
  }

  // 3. Señalización (NOM-026-STPS-2008)
  if (!device.hasSignaling) {
    isValid = false;
    alerts.push(
      `⚠️ FALTA SEÑALIZACIÓN (NOM-026-STPS-2008): Se requiere señal visual de ubicación de extintor colocada a 1.80m - 2.00m.`
    );
  } else if (device.signalingHeight < 1.80 || device.signalingHeight > 2.00) {
    alerts.push(
      `ℹ️ AJUSTE DE SEÑAL (NOM-026-STPS-2008): La altura de la señal (${device.signalingHeight.toFixed(
        2
      )}m) debe ubicarse preferentemente entre 1.80m y 2.00m.`
    );
  }

  // 4. Distancia máxima de recorrido entre extintores (NOM-002-STPS-2010)
  const maxAllowedDistM = device.riskZone === 'HIGH_RISK' ? 15.0 : 30.0;
  
  // Buscar extintor más cercano
  let minDistanceM = Infinity;
  for (const other of allDevices) {
    if (other.id === device.id) continue;
    const dxPx = other.x - device.x;
    const dyPx = other.y - device.y;
    const distPx = Math.sqrt(dxPx * dxPx + dyPx * dyPx);
    const distM = distPx * scaleMetersPerPx;
    if (distM < minDistanceM) {
      minDistanceM = distM;
    }
  }

  if (allDevices.length > 1 && minDistanceM > maxAllowedDistM) {
    isValid = false;
    alerts.push(
      `🚨 DISTANCIA EXCEDIDA (NOM-002-STPS-2010): Distancia al extintor más cercano es ${minDistanceM.toFixed(
        1
      )}m, superando los ${maxAllowedDistM}m máximos permitidos en zona de ${
        device.riskZone === 'HIGH_RISK' ? 'Alto Riesgo' : 'Riesgo Ordinario'
      }.`
    );
  }

  return {
    isValid,
    alerts,
    medicalAreaName: areaConfig.name,
    recommendedType: areaConfig.recommendedType,
    maxDistanceMeters: maxAllowedDistM,
    nearestExtinguisherDistanceMeters: minDistanceM === Infinity ? undefined : minDistanceM,
  };
}
