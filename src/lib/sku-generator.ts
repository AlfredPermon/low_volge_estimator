/**
 * Utilidad para generación automática de SKU (Stock Keeping Unit)
 * 
 * La nomenclatura SKU sigue el patrón: {SISTEMA}-{CATEGORÍA_ABREV}-{CONSECUTIVO}
 * 
 * Ejemplos:
 * - CCTV-EQP-001 (Equipo de CCTV)
 * - ACC-ACC-001 (Accesorio de Acceso)
 * - CAB-CON-001 (Consumible de Cableado)
 * - CCTV-MO-001 (Mano de obra de CCTV)
 */

// Mapa de abreviaturas de categorías
export const CATEGORY_ABBREVIATIONS: Record<string, string> = {
  'Equipo': 'EQP',
  'Accesorio': 'ACC',
  'Consumible': 'CON',
  'Mano de Obra': 'MO',
  'Servicio': 'SRV',
};

// Mapa de abreviaturas de sistemas
export const SYSTEM_ABBREVIATIONS: Record<string, string> = {
  'CCTV': 'CCTV',
  'ACCESO': 'ACC',
  'VOCEO': 'VOC',
  'INCENDIO': 'FIR',
  'CANALIZACION': 'CAN',
  'CABLEADO': 'CAB',
  'GENERAL': 'GEN',
};

// Códigos de tipo de dispositivo para SKU más descriptivos
export const DEVICE_TYPE_CODES: Record<string, string> = {
  // CCTV
  'cctv_camera_bullet': 'CAM',
  'cctv_camera_domo': 'DOM',
  'cctv_camera_ptz': 'PTZ',
  'cctv_camera_fisheye': 'FISH',
  'cctv_nvr': 'NVR',
  'cctv_disk': 'DISK',
  'cctv_license': 'LIC',
  // ACCESO
  'access_reader': 'TER',
  'access_controller': 'CTR',
  'access_turnstile': 'TSR',
  'access_magnetic_lock': 'MAG',
  'access_exit_button': 'BTN',
  'access_touchless_button': 'TLS',
  'access_software': 'SW',
  // VOCEO
  'paging_speaker_exterior': 'SPK',
  'paging_speaker_colgante': 'SPH',
  'paging_speaker_ip': 'SPI',
  'paging_speaker_bluetooth': 'SPB',
  'paging_amplifier': 'AMP',
  'paging_gateway': 'GW',
  // INCENDIO
  'fire_smoke_detector': 'SMK',
  'fire_heat_detector': 'HEAT',
  'fire_manual_station': 'MAN',
  'fire_strobe': 'STR',
  'fire_horn_strobe': 'HST',
  'fire_co_detector': 'CO',
  'fire_panel': 'PAN',
  'fire_annunciator': 'ANN',
  // CABLEADO
  'cable_utp': 'UTP',
  'cable_fplr': 'FPLR',
  'cable_speaker': 'CSP',
  // CANALIZACION
  'conduit': 'PIP',
  'codo': 'ELB',
  'cople': 'CPL',
  'conector': 'CON',
  'soporte': 'SUP',
  'caja': 'BOX',
  'tapa': 'CAP',
  'flexible_plica': 'FLEX',
  // MANO DE OBRA
  'labor_cctv': 'MO',
  'labor_access': 'MO',
  'labor_paging': 'MO',
  'labor_fire': 'MO',
};

/**
 * Genera una base de SKU a partir de los campos proporcionados
 * sin el consecutivo (ej: CCTV-EQP)
 */
export function generateSkuBase(
  system: string,
  category: string
): string {
  const systemAbbr = SYSTEM_ABBREVIATIONS[system] || system.substring(0, 3).toUpperCase();
  const categoryAbbr = CATEGORY_ABBREVIATIONS[category] || category.substring(0, 3).toUpperCase();
  
  return `${systemAbbr}-${categoryAbbr}`;
}

/**
 * Genera un SKU completo con consecutivo
 */
export function generateSku(
  system: string,
  category: string,
  sequence: number
): string {
  const base = generateSkuBase(system, category);
  return `${base}-${String(sequence).padStart(3, '0')}`;
}

/**
 * Genera un SKU descriptivo usando el tipo de dispositivo
 * Formato: {SISTEMA}-{TIPO_DISPOSITIVO}-{CONSECUTIVO}
 */
export function generateDescriptiveSku(
  system: string,
  deviceType: string,
  sequence: number
): string {
  const systemAbbr = SYSTEM_ABBREVIATIONS[system] || system.substring(0, 3).toUpperCase();
  const deviceAbbr = DEVICE_TYPE_CODES[deviceType] || deviceType.substring(0, 3).toUpperCase();
  
  return `${systemAbbr}-${deviceAbbr}-${String(sequence).padStart(3, '0')}`;
}

/**
 * Parsea un SKU existente para extraer sus componentes
 */
export function parseSku(sku: string): {
  system: string | null;
  categoryOrType: string | null;
  sequence: number | null;
  isValid: boolean;
} {
  const pattern = /^([A-Z]+)-([A-Z]+)-(\d{3,})$/;
  const match = sku.match(pattern);
  
  if (!match) {
    return {
      system: null,
      categoryOrType: null,
      sequence: null,
      isValid: false,
    };
  }
  
  return {
    system: match[1],
    categoryOrType: match[2],
    sequence: parseInt(match[3], 10),
    isValid: true,
  };
}

/**
 * Valida si un SKU cumple con el formato requerido
 */
export function validateSku(sku: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!sku || sku.trim() === '') {
    errors.push('El SKU no puede estar vacío');
    return { isValid: false, errors };
  }
  
  const pattern = /^([A-Z]+)-([A-Z]+)-(\d{3,})$/;
  const match = sku.match(pattern);
  
  if (!match) {
    errors.push('El SKU debe seguir el formato: SISTEMA-CATEGORIA-CONSECUTIVO (ej: CCTV-EQP-001)');
  } else {
    const system = match[1];
    const category = match[2];
    const sequence = parseInt(match[3], 10);
    
    if (system.length < 2 || system.length > 5) {
      errors.push('La abreviatura del sistema debe tener entre 2 y 5 caracteres');
    }
    
    if (category.length < 2 || category.length > 5) {
      errors.push('La abreviatura de la categoría debe tener entre 2 y 5 caracteres');
    }
    
    if (sequence < 1 || sequence > 999999) {
      errors.push('El consecutivo debe estar entre 1 y 999999');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}
