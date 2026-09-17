/**
 * Motor de Cálculo Espacial 2.5D, Normativo (NFPA 72 / NEC / NOM-001-SEDE)
 * Específico para Sistemas de Detección de Incendios Hochiki / FIRE.
 */

export interface ZonaExclusion {
  id: string;
  nombre?: string;
  puntos: Array<{ x: number; y: number }>;
}

export interface DispositivoFire {
  id: string;
  tipo:
    | 'ALN_Humo'
    | 'ACD_Multisensor'
    | 'Estacion_Manual'
    | 'Sirena_Estrobo'
    | 'Modulo_Control'
    | 'Detector de Humo'
    | 'Detector Térmico'
    | 'Panel Principal Hochiki'
    | 'Anunciador Remoto LCD'
    | string;
  x_px: number;
  y_px: number;
  z_m?: number;
  lazo_id?: string;
  direccion_lazo?: number;
}

export interface LazoSLC {
  id: string;
  nombre: string;
  tipo_cable: 'FPLR_2x18' | 'FPLR_2x14';
  clase: 'A' | 'B';
  panel_id?: string;
  nodos_ordenados: string[];
}

export interface CanalizacionSegmento {
  id: string;
  nodo_origen_id: string;
  nodo_destino_id: string;
  cables_dentro: string[];
  longitud_horizontal_m: number;
  diametro_emt_pulgadas: string;
  porcentaje_llenado: number;
  warning?: string;
}

export interface BOMItem {
  sku: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  categoria: string;
}

export interface BOMFireResult {
  tuberiasEMT: Record<string, { metros: number; tramos3m: number }>;
  coples: number;
  conectores: number;
  cajas4x4: number;
  cajasOctagonales4: number;
  cajasRectangulares4x2: number;
  soporteriaAbrazaderas: number;
  cablesMetros: number;
  bobinas305m: number;
  itemsBOM: BOMItem[];
}

// ─── ALTURAS DE MONTAJE NORMATIVAS (HOCHIKI / NFPA 72) ─────────────────────

export const PANEL_MOUNT_HEIGHT_M = 1.5; // Panel Principal a 1.5m
export const ANNUNCIATOR_MOUNT_HEIGHT_M = 1.5; // Anunciadores Remotos a 1.5m
export const MANUAL_STATION_MOUNT_HEIGHT_M = 1.3; // Estaciones Manuales a 1.3m (NFPA 72 / ADA)
export const STROBE_SIREN_MOUNT_HEIGHT_M = 2.1; // Sirenas Estrobo a 2.1m

export const NFPA72_SMOKE_RADIUS_METERS = 6.4; // 9.1m / sqrt(2)
export const NFPA72_SMOKE_SPACING_METERS = 9.1; // 30 ft
export const NFPA72_HVAC_MIN_DISTANCE_METERS = 1.5; // 1.5m min distance to air vent

// ─── 1. MOTOR DE COBERTURA Y ZONAS DE EXCLUSIÓN (NFPA 72) ───────────────────

function distToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const l2 = Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2);
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
}

function pointInPolygon(
  p: { x: number; y: number },
  polygon: Array<{ x: number; y: number }>
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;
    const intersect =
      yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function calcularDistanciaAZonaExclusionM(
  p: { x: number; y: number },
  zona: ZonaExclusion,
  escalaMetersPerPx: number
): number {
  if (!zona.puntos || zona.puntos.length === 0) return Infinity;
  if (pointInPolygon(p, zona.puntos)) return 0;

  let minDistPx = Infinity;
  for (let i = 0; i < zona.puntos.length; i++) {
    const a = zona.puntos[i];
    const b = zona.puntos[(i + 1) % zona.puntos.length];
    const d = distToSegment(p, a, b);
    if (d < minDistPx) minDistPx = d;
  }

  return minDistPx * escalaMetersPerPx;
}

export function evaluarAdvertenciaExclusionHVAC(
  p: { x: number; y: number },
  zonas: ZonaExclusion[],
  escalaMetersPerPx: number
): { enRiesgo: boolean; distanciaMinimaM: number; nombreZona?: string } {
  let minDistanceM = Infinity;
  let zonaCercana: string | undefined = undefined;

  for (const z of zonas) {
    const dM = calcularDistanciaAZonaExclusionM(p, z, escalaMetersPerPx);
    if (dM < minDistanceM) {
      minDistanceM = dM;
      zonaCercana = z.nombre || 'Inyección A/A';
    }
  }

  return {
    enRiesgo: minDistanceM < NFPA72_HVAC_MIN_DISTANCE_METERS,
    distanciaMinimaM: minDistanceM === Infinity ? 999 : minDistanceM,
    nombreZona: zonaCercana,
  };
}

export function sembrarDetectoresHumoNFPA72(
  widthPx: number,
  heightPx: number,
  escalaMetersPerPx: number,
  zonasExclusion: ZonaExclusion[] = []
): Array<{ x: number; y: number; enRiesgoHVAC: boolean }> {
  const stepPx = NFPA72_SMOKE_SPACING_METERS / escalaMetersPerPx;
  const startPx = stepPx / 2;
  const detectores: Array<{ x: number; y: number; enRiesgoHVAC: boolean }> = [];

  for (let x = startPx; x < widthPx; x += stepPx) {
    for (let y = startPx; y < heightPx; y += stepPx) {
      const point = { x: Math.round(x), y: Math.round(y) };
      const evalHVAC = evaluarAdvertenciaExclusionHVAC(point, zonasExclusion, escalaMetersPerPx);

      if (evalHVAC.distanciaMinimaM === 0) continue;

      detectores.push({
        x: point.x,
        y: point.y,
        enRiesgoHVAC: evalHVAC.enRiesgo,
      });
    }
  }

  return detectores;
}

// ─── 2. MOTOR DE ENRUTAMIENTO DE LAZOS HOCHIKI (127 DISPOSITIVOS / CLASE A & B) ──────────

export const HOCHIKI_SLC_MAX_DEVICES = 127;

export function validarCapacidadLazoSLC(numDispositivos: number): {
  valido: boolean;
  alerta?: string;
} {
  if (numDispositivos > HOCHIKI_SLC_MAX_DEVICES) {
    return {
      valido: false,
      alerta: `⚠️ EXCESO DE CAPACIDAD HOCHIKI: El lazo SLC soporta un máximo estricto de 127 dispositivos direccionables. Ha intentado agregar el dispositivo #${numDispositivos}.`,
    };
  }
  return { valido: true };
}

// ─── 3. MOTOR DE CÁLCULO DE CABLE EN 3D Y BUS RS-485 ──────────────────────

export interface Parametros3DFire {
  hLosaM?: number; // Altura de losa (ej. 3.8m)
  hPlafonM?: number; // Altura de plafón (ej. 3.0m)
  largoM?: number; // Largo del área en metros
  anchoM?: number; // Ancho del área en metros
  slackPorBaseM?: number; // Holgura (0.20m por base)
  margenDesperdicio?: number; // 0.05, 0.10, 0.15
}

export function getDeviceMountHeight(tipo: string, hPlafon: number): { hDev: number; esPared: boolean; esTecho: boolean } {
  const tipoLower = String(tipo || '').toLowerCase();
  if (tipoLower.includes('panel')) {
    return { hDev: PANEL_MOUNT_HEIGHT_M, esPared: true, esTecho: false };
  }
  if (tipoLower.includes('anunciador')) {
    return { hDev: ANNUNCIATOR_MOUNT_HEIGHT_M, esPared: true, esTecho: false };
  }
  if (tipoLower.includes('estacion') || tipoLower.includes('manual') || tipoLower.includes('ams')) {
    return { hDev: MANUAL_STATION_MOUNT_HEIGHT_M, esPared: true, esTecho: false };
  }
  if (tipoLower.includes('sirena') || tipoLower.includes('estrobo') || tipoLower.includes('hec3')) {
    return { hDev: STROBE_SIREN_MOUNT_HEIGHT_M, esPared: true, esTecho: false };
  }
  return { hDev: hPlafon, esPared: false, esTecho: true };
}

export function calcularMetrajeCable3DFire(
  dispositivos: DispositivoFire[],
  clase: 'A' | 'B',
  posicionPanelPx: { x: number; y: number },
  escalaMetersPerPx: number,
  params: Parametros3DFire = {}
): {
  metrajeTotalM: number;
  canalizacionEmtTotalM: number;
  cableSLC: number;
  cableRS485: number;
  cantidadLazos: number;
  superficieM2: number;
  metrajeDesglose: { horizontalM: number; verticalM: number; holguraM: number; rs485M: number };
} {
  const hLosa = params.hLosaM ?? 3.8;
  const hPlafon = params.hPlafonM ?? 3.0;
  const largo = params.largoM ?? 30.0;
  const ancho = params.anchoM ?? 20.0;
  const slack = params.slackPorBaseM ?? 0.20;
  const desperdicio = params.margenDesperdicio ?? 0.10;

  const superficieM2 = Math.round(largo * ancho);

  const detectoresTecho = dispositivos.filter((d) => getDeviceMountHeight(d.tipo, hPlafon).esTecho);
  const estaciones = dispositivos.filter((d) => String(d.tipo).toLowerCase().includes('estacion') || String(d.tipo).toLowerCase().includes('manual'));
  const sirenas = dispositivos.filter((d) => String(d.tipo).toLowerCase().includes('sirena') || String(d.tipo).toLowerCase().includes('estrobo'));
  const paneles = dispositivos.filter((d) => String(d.tipo).toLowerCase().includes('panel'));
  const anunciadores = dispositivos.filter((d) => String(d.tipo).toLowerCase().includes('anunciador'));

  const nCampo = detectoresTecho.length + estaciones.length + sirenas.length;

  // División automática de Lazos SLC (Límite estricto Hochiki de 127 dispositivos)
  const cantidadLazos = Math.max(1, Math.ceil(nCampo / HOCHIKI_SLC_MAX_DEVICES));

  // 1. Canalización EMT (Tramos de derivación + Acometidas)
  const countDetectores = Math.max(1, detectoresTecho.length);
  const horizontalPorDetector = countDetectores > 0 ? largo / countDetectores : 0;
  const emtHorizDetectores = detectoresTecho.length * horizontalPorDetector;

  const descensosEstaciones = estaciones.length * (hLosa - MANUAL_STATION_MOUNT_HEIGHT_M);
  const descensosSirenas = sirenas.length * (hLosa - STROBE_SIREN_MOUNT_HEIGHT_M);
  const descensoPanelUnico = hLosa - PANEL_MOUNT_HEIGHT_M;
  const descensosPaneles = descensoPanelUnico * cantidadLazos * (clase === 'A' ? 2 : 1) * Math.max(1, paneles.length);
  const descensosAnunciadores = anunciadores.length * (hLosa - ANNUNCIATOR_MOUNT_HEIGHT_M);

  // Suma de canalización EMT Total
  const canalizacionEmtTotalM = Math.round(
    (emtHorizDetectores + descensosEstaciones + descensosSirenas + descensosPaneles + descensosAnunciadores) * 100
  ) / 100;

  // 2. Lazo SLC (Cable Total 2.5D vs Canalización EMT Coherente)
  let cableSLCBase = 0;
  if (clase === 'B') {
    cableSLCBase = canalizacionEmtTotalM;
  } else {
    // Clase A (Lazo Cerrado: ida y retorno)
    cableSLCBase = canalizacionEmtTotalM * 2;
  }

  const cableSLC = (cableSLCBase + nCampo * slack) * (1 + desperdicio);

  // 3. Bus RS-485 (Anunciadores Remotos)
  let cableRS485 = 0;
  const A = anunciadores.length;
  if (A > 0) {
    const distHorizAnn = (largo / (A + 1)) * A;
    const descensoPanelBus = hLosa - PANEL_MOUNT_HEIGHT_M;
    const descensoAnnTotal = A * (hLosa - ANNUNCIATOR_MOUNT_HEIGHT_M);
    const busBase = distHorizAnn + descensoPanelBus + descensoAnnTotal;
    cableRS485 = (busBase + A * slack) * (1 + desperdicio);
  }

  const metrajeTotalM = Math.round((cableSLC + cableRS485) * 100) / 100;

  return {
    metrajeTotalM,
    canalizacionEmtTotalM,
    cableSLC: Math.round(cableSLC * 100) / 100,
    cableRS485: Math.round(cableRS485 * 100) / 100,
    cantidadLazos,
    superficieM2,
    metrajeDesglose: {
      horizontalM: Math.round(emtHorizDetectores * 100) / 100,
      verticalM: Math.round((descensosEstaciones + descensosSirenas + descensosPaneles + descensosAnunciadores) * 100) / 100,
      holguraM: Math.round((nCampo + A) * slack * 100) / 100,
      rs485M: Math.round(cableRS485 * 100) / 100,
    },
  };
}

// ─── 4. MOTOR DE DIMENSIONAMIENTO DE TUBERÍA EMT (NEC CAP. 9 / NOM-001) ──────────

export const AREAS_CABLE_MM2 = {
  FPLR_2x18: 16.4, // AWG 18/2 (Diámetro ≈ 4.57 mm)
  FPLR_2x14: 29.2, // AWG 14/2 (Diámetro ≈ 6.10 mm)
} as const;

export const EMT_SIZES_MM2 = [
  { diametro: '1/2"', areaTotalMM2: 196 },
  { diametro: '3/4"', areaTotalMM2: 343 },
  { diametro: '1"', areaTotalMM2: 557 },
  { diametro: '1 1/4"', areaTotalMM2: 967 },
] as const;

export function calcularDiametroCanalizacion(
  numCables: number,
  tipoCable: 'FPLR_2x18' | 'FPLR_2x14' = 'FPLR_2x18'
): {
  diametroEmtPulgadas: string;
  porcentajeLlenadoReal: number;
  maxPorcentajePermitido: number;
  alerta?: string;
} {
  const n = Math.max(1, numCables);
  const areaUnitaria = AREAS_CABLE_MM2[tipoCable] || AREAS_CABLE_MM2.FPLR_2x18;
  const areaTotalCables = n * areaUnitaria;

  let maxPercent = 0.40;
  if (n === 1) maxPercent = 0.53;
  else if (n === 2) maxPercent = 0.31;
  else maxPercent = 0.40;

  for (const tubo of EMT_SIZES_MM2) {
    const areaUsable = tubo.areaTotalMM2 * maxPercent;
    if (areaTotalCables <= areaUsable) {
      const pctReal = Math.round((areaTotalCables / tubo.areaTotalMM2) * 1000) / 10;
      return {
        diametroEmtPulgadas: tubo.diametro,
        porcentajeLlenadoReal: pctReal,
        maxPorcentajePermitido: Math.round(maxPercent * 100),
      };
    }
  }

  const mayorTubo = EMT_SIZES_MM2[EMT_SIZES_MM2.length - 1];
  const pctReal = Math.round((areaTotalCables / mayorTubo.areaTotalMM2) * 1000) / 10;

  return {
    diametroEmtPulgadas: mayorTubo.diametro,
    porcentajeLlenadoReal: pctReal,
    maxPorcentajePermitido: Math.round(maxPercent * 100),
    alerta: `⚠️ EXCESO DE LLENADO EMT: La ocupación del ${pctReal}% excede el límite normativo del ${Math.round(maxPercent * 100)}% en tubo de 1 1/4". Se requiere dividir la trayectoria en 2 o más tuberías.`,
  };
}

// ─── 5. GENERADOR DE BILL OF MATERIALS (BOM) PARA FIRE ─────────────────────

export function generarBOMFire(
  metrajeCable: number,
  distanciaConduitTotalM: number,
  dispositivos: DispositivoFire[],
  tipoCable: 'FPLR_2x18' | 'FPLR_2x14' = 'FPLR_2x18'
): BOMFireResult {
  const calcEMT = calcularDiametroCanalizacion(1, tipoCable);
  const diam = calcEMT.diametroEmtPulgadas;

  // 1. Tubos EMT (3m)
  const tramos3m = Math.ceil(distanciaConduitTotalM / 3.0);
  const coples = Math.max(0, tramos3m - 1);
  const soporteriaAbrazaderas = Math.ceil(distanciaConduitTotalM / 1.5);

  let nDetectores = 0;
  let nEstaciones = 0;
  let nSirenas = 0;
  let nAnunciadores = 0;

  dispositivos.forEach((dev) => {
    const tipoLower = String(dev.tipo || '').toLowerCase();
    if (tipoLower.includes('anunciador')) {
      nAnunciadores++;
    } else if (tipoLower.includes('estacion') || tipoLower.includes('manual') || tipoLower.includes('ams')) {
      nEstaciones++;
    } else if (tipoLower.includes('sirena') || tipoLower.includes('estrobo') || tipoLower.includes('hec3')) {
      nSirenas++;
    } else if (!tipoLower.includes('panel')) {
      nDetectores++;
    }
  });

  // 2. Cajas 4x4 = N_detectores + N_estaciones + N_sirenas + N_anunciadores
  const cajas4x4 = nDetectores + nEstaciones + nSirenas + nAnunciadores;

  // 3. Conectores EMT = (Tubos_EMT * 2) + (Cajas_4x4 * 2)
  const conectores = tramos3m * 2 + cajas4x4 * 2;

  let cajasOctagonales4 = nDetectores;
  let cajasRectangulares4x2 = nEstaciones + nSirenas + nAnunciadores;

  // 4. Bobinas 305m = Math.ceil(Cable_Total / 305)
  const bobinas305m = Math.ceil(metrajeCable / 305.0);

  const itemsBOM: BOMItem[] = [
    {
      sku: `EMT-PIPE-${diam.replace(/[^0-9/]/g, '')}`,
      descripcion: `Tubería EMT ${diam} para sistema contra incendio (tramos 3m)`,
      unidad: 'tramo',
      cantidad: tramos3m,
      categoria: 'Canalización',
    },
    {
      sku: `EMT-CONN-${diam.replace(/[^0-9/]/g, '')}`,
      descripcion: `Conector conduit EMT ${diam}`,
      unidad: 'pza',
      cantidad: conectores,
      categoria: 'Accesorio',
    },
    {
      sku: `EMT-CPL-${diam.replace(/[^0-9/]/g, '')}`,
      descripcion: `Cople conduit EMT ${diam}`,
      unidad: 'pza',
      cantidad: coples,
      categoria: 'Accesorio',
    },
    {
      sku: 'BOX-4X4-GENERIC',
      descripcion: 'Caja de registro 4"x4" metálica universal (techo / empotrar)',
      unidad: 'pza',
      cantidad: cajas4x4,
      categoria: 'Accesorio',
    },
    {
      sku: 'SUP-CLAMP-1.5M',
      descripcion: 'Abrazadera tipo uña / colgador pera para tubería EMT (cada 1.5m)',
      unidad: 'pza',
      cantidad: soporteriaAbrazaderas,
      categoria: 'Soportería',
    },
    {
      sku: tipoCable === 'FPLR_2x14' ? 'FIR-CAB-14AWG' : 'FIR-CAB-18AWG',
      descripcion: `Cable FPLR ${tipoCable === 'FPLR_2x14' ? '2x14 AWG' : '2x18 AWG'} blindado contra incendio (Bobina 305m)`,
      unidad: 'bobina',
      cantidad: bobinas305m,
      categoria: 'Cableado',
    },
  ];

  return {
    tuberiasEMT: {
      [diam]: { metros: distanciaConduitTotalM, tramos3m },
    },
    coples,
    conectores,
    cajas4x4,
    cajasOctagonales4,
    cajasRectangulares4x2,
    soporteriaAbrazaderas,
    cablesMetros: metrajeCable,
    bobinas305m,
    itemsBOM,
  };
}
