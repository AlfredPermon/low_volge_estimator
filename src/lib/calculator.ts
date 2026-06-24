// ─── Types ───────────────────────────────────────────────────────────────────

export type SystemName = "CCTV" | "ACCESO" | "VOCEO" | "INCENDIO" | "CANALIZACION" | "CABLEADO" | "GENERAL";

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
  totalAmount: number;
  system: SystemName;
  category: string;
  isEstimated?: boolean;
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
  active: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function matchPriceItem(
  items: PriceItemRecord[],
  system: string,
  category: string,
  keywords: string[]
): PriceItemRecord | null {
  const lowered = keywords.map((k) => k.toLowerCase());
  return (
    items.find((item) => {
      if (item.system !== system) return false;
      if (category && item.category !== category) return false;
      const desc = item.description.toLowerCase();
      return lowered.some((kw) => desc.includes(kw));
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
  isEstimated = false
): LineItem {
  return {
    partida: `${systemPrefix}.${String(idx).padStart(2, "0")}`,
    code,
    description,
    unit,
    quantity: round2(quantity),
    unitCost: round2(unitCost),
    totalAmount: round2(quantity * unitCost),
    system,
    category,
    isEstimated,
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

export function calculateCCTV(
  config: CctvConfig,
  factors: EstimateFactors,
  priceItems: PriceItemRecord[]
): SystemBreakdown {
  const items: LineItem[] = [];
  let idx = 1;

  // Total camera count
  const totalCameras = config.cameras.reduce((sum, c) => sum + c.qty, 0);

  // Cable calculation for cameras
  const cableLength = round2(
    (config.avgDistanceMeters + factors.verticalDrop + factors.rackAllowance) * totalCameras * (1 + factors.wasteFactorCable)
  );

  // Conduit calculation for cameras
  const conduitLength = round2(config.avgDistanceMeters * totalCameras * (1 + factors.wasteFactorConduit));

  // --- Cameras ---
  for (const cam of config.cameras) {
    const typeLower = cam.type.toLowerCase();
    const keywords: string[] = [];
    if (typeLower.includes("bullet")) keywords.push("bullet");
    else if (typeLower.includes("domo") || typeLower.includes("dome")) keywords.push("domo");
    else if (typeLower.includes("ptz")) keywords.push("ptz");
    else if (typeLower.includes("fisheye")) keywords.push("fisheye");

    const matched = matchPriceItem(priceItems, "CCTV", "Equipo", keywords);
    const unitCost = matched?.unitCost ?? getEstimatedCost("cctv_camera_" + typeLower);

    items.push(
      makeLineItem(
        idx++, "5.7.3", "CCTV", `CCTV-CAM-${String(idx).padStart(3, "0")}`,
        `Cámara IP ${cam.type} ${cam.hasPoE ? "PoE" : ""} exterior 5MP`,
        "pza", cam.qty, unitCost, "Equipo", !matched
      )
    );
  }

  // --- NVR ---
  const nvrMatch = matchPriceItem(priceItems, "CCTV", "Equipo", ["NVR", "grabador"]);
  const nvrCost = nvrMatch?.unitCost ?? getEstimatedCost("cctv_nvr");
  items.push(
    makeLineItem(idx++, "5.7.3", "CCTV", "CCTV-NVR-001", `NVR ${config.nvr.bays} bahías`, "pza", config.nvr.qty, nvrCost, "Equipo", !nvrMatch)
  );

  // --- Storage Disks ---
  const totalDisks = config.nvr.bays * config.nvr.disksPerBay;
  const diskMatch = matchPriceItem(priceItems, "CCTV", "Equipo", ["disco", "disco duro", "HDD", "almacenamiento"]);
  const diskCost = diskMatch?.unitCost ?? getEstimatedCost("cctv_disk");
  if (totalDisks > 0) {
    items.push(
      makeLineItem(idx++, "5.7.3", "CCTV", "CCTV-DISK-001", `Disco duro ${config.nvr.storageTB}TB para NVR`, "pza", totalDisks, diskCost, "Equipo", !diskMatch)
    );
  }

  // --- Licenses ---
  if (config.licenses > 0) {
    const licMatch = matchPriceItem(priceItems, "CCTV", "Equipo", ["licencia", "license"]);
    const licCost = licMatch?.unitCost ?? getEstimatedCost("cctv_license");
    items.push(
      makeLineItem(idx++, "5.7.3", "CCTV", "CCTV-LIC-001", "Licencia de cámara IP adicional", "pza", config.licenses, licCost, "Equipo", !licMatch)
    );
  }

  // --- Cable UTP ---
  const cableMatch = matchPriceItem(priceItems, "CABLEADO", "Equipo", ["UTP", "cable UTP", "cable Cat"]);
  const cableCost = cableMatch?.unitCost ?? getEstimatedCost("cable_utp");
  items.push(
    makeLineItem(idx++, "5.7.3", "CCTV", "CCTV-CAB-001", "Cable UTP Cat6 para CCTV", "ml", cableLength, cableCost, "Equipo", !cableMatch)
  );

  // --- Conduit ---
  const conduitMatch = matchPriceItem(priceItems, "CANALIZACION", "Equipo", ["conduit", "tubo"]);
  const conduitCost = conduitMatch?.unitCost ?? getEstimatedCost("conduit");
  items.push(
    makeLineItem(idx++, "5.7.3", "CCTV", "CCTV-CON-001", "Conduit 3/4\" para CCTV", "ml", conduitLength, conduitCost, "Equipo", !conduitMatch)
  );

  // --- Conduit fittings (codo, cople) ---
  const fittingCount = Math.ceil(conduitLength / 3);
  const codoMatch = matchPriceItem(priceItems, "CANALIZACION", "Accesorio", ["codo"]);
  const codoCost = codoMatch?.unitCost ?? getEstimatedCost("codo");
  if (fittingCount > 0) {
    items.push(
      makeLineItem(idx++, "5.7.3", "CCTV", "CCTV-CODO-001", "Codo conduit 3/4\" 90°", "pza", fittingCount, codoCost, "Accesorio", !codoMatch)
    );
  }

  const copleMatch = matchPriceItem(priceItems, "CANALIZACION", "Accesorio", ["cople"]);
  const copleCost = copleMatch?.unitCost ?? getEstimatedCost("cople");
  if (fittingCount > 0) {
    items.push(
      makeLineItem(idx++, "5.7.3", "CCTV", "CCTV-COPL-001", "Cople conduit 3/4\"", "pza", fittingCount, copleCost, "Accesorio", !copleMatch)
    );
  }

  // --- Labor ---
  const laborMatch = matchPriceItem(priceItems, "CCTV", "Mano de Obra", ["mano de obra", "instalación"]);
  const laborCost = laborMatch?.unitCost ?? getEstimatedCost("labor_cctv");
  items.push(
    makeLineItem(idx++, "5.7.3", "CCTV", "CCTV-MO-001", "Instalación de sistema CCTV (mano de obra)", "lote", 1, laborCost * totalCameras, "Mano de Obra", !laborMatch)
  );

  const sums = sumLineItems(items);
  return { ...sums, lineItems: items };
}

export function calculateAccess(
  config: AccessConfig,
  factors: EstimateFactors,
  priceItems: PriceItemRecord[]
): SystemBreakdown {
  const items: LineItem[] = [];
  let idx = 1;

  const totalDevices = config.doors + config.controllers + config.turnstiles + config.magneticLocks + config.exitButtons + config.touchlessButtons;

  // Cable
  const cableLength = round2(
    (config.avgDistanceMeters + factors.verticalDrop + factors.rackAllowance) * totalDevices * (1 + factors.wasteFactorCable)
  );

  // Conduit
  const conduitLength = round2(config.avgDistanceMeters * totalDevices * (1 + factors.wasteFactorConduit));

  // --- Readers / Terminals ---
  const readerMatch = matchPriceItem(priceItems, "ACCESO", "Equipo", ["lectora", "terminal", "reconocimiento", "biometrica"]);
  const readerCost = readerMatch?.unitCost ?? getEstimatedCost("access_reader");
  items.push(
    makeLineItem(idx++, "5.7.4", "ACCESO", "ACC-TER-001", `Terminal de acceso ${config.readerType}`, "pza", config.doors, readerCost, "Equipo", !readerMatch)
  );

  // --- Controllers ---
  const ctrlMatch = matchPriceItem(priceItems, "ACCESO", "Equipo", ["controlador"]);
  const ctrlCost = ctrlMatch?.unitCost ?? getEstimatedCost("access_controller");
  items.push(
    makeLineItem(idx++, "5.7.4", "ACCESO", "ACC-CTR-001", "Controlador de acceso de 2 puertas", "pza", config.controllers, ctrlCost, "Equipo", !ctrlMatch)
  );

  // --- Turnstiles ---
  if (config.turnstiles > 0) {
    const tsMatch = matchPriceItem(priceItems, "ACCESO", "Equipo", ["torniquete"]);
    const tsCost = tsMatch?.unitCost ?? getEstimatedCost("access_turnstile");
    items.push(
      makeLineItem(idx++, "5.7.4", "ACCESO", "ACC-TSR-001", "Torniquete de acceso", "pza", config.turnstiles, tsCost, "Equipo", !tsMatch)
    );
  }

  // --- Magnetic Locks ---
  const lockMatch = matchPriceItem(priceItems, "ACCESO", "Equipo", ["cerradura", "chapa", "magnética"]);
  const lockCost = lockMatch?.unitCost ?? getEstimatedCost("access_magnetic_lock");
  items.push(
    makeLineItem(idx++, "5.7.4", "ACCESO", "ACC-LOC-001", "Cerradura magnética 280kg", "pza", config.magneticLocks, lockCost, "Equipo", !lockMatch)
  );

  // --- Exit Buttons ---
  if (config.exitButtons > 0) {
    const btnMatch = matchPriceItem(priceItems, "ACCESO", "Equipo", ["botón", "pulsador"]);
    const btnCost = btnMatch?.unitCost ?? getEstimatedCost("access_exit_button");
    items.push(
      makeLineItem(idx++, "5.7.4", "ACCESO", "ACC-BTN-001", "Botón de salida", "pza", config.exitButtons, btnCost, "Equipo", !btnMatch)
    );
  }

  // --- Touchless Buttons ---
  if (config.touchlessButtons > 0) {
    const tlMatch = matchPriceItem(priceItems, "ACCESO", "Equipo", ["touchless", "sin contacto"]);
    const tlCost = tlMatch?.unitCost ?? getEstimatedCost("access_touchless_button");
    items.push(
      makeLineItem(idx++, "5.7.4", "ACCESO", "ACC-TLB-001", "Botón sin contacto (touchless)", "pza", config.touchlessButtons, tlCost, "Equipo", !tlMatch)
    );
  }

  // --- Software Licenses ---
  if (config.softwareLicenses > 0) {
    const swMatch = matchPriceItem(priceItems, "ACCESO", "Equipo", ["software", "licencia"]);
    const swCost = swMatch?.unitCost ?? getEstimatedCost("access_software");
    items.push(
      makeLineItem(idx++, "5.7.4", "ACCESO", "ACC-SW-001", "Licencia de software de acceso", "pza", config.softwareLicenses, swCost, "Equipo", !swMatch)
    );
  }

  // --- Cable ---
  const cableMatch = matchPriceItem(priceItems, "CABLEADO", "Equipo", ["UTP", "cable UTP", "cable Cat"]);
  const cableCost = cableMatch?.unitCost ?? getEstimatedCost("cable_utp");
  items.push(
    makeLineItem(idx++, "5.7.4", "ACCESO", "ACC-CAB-001", "Cable UTP Cat6 para control de acceso", "ml", cableLength, cableCost, "Equipo", !cableMatch)
  );

  // --- Conduit ---
  const conduitMatch = matchPriceItem(priceItems, "CANALIZACION", "Equipo", ["conduit", "tubo"]);
  const conduitCost = conduitMatch?.unitCost ?? getEstimatedCost("conduit");
  items.push(
    makeLineItem(idx++, "5.7.4", "ACCESO", "ACC-CON-001", "Conduit 3/4\" para control de acceso", "ml", conduitLength, conduitCost, "Equipo", !conduitMatch)
  );

  // --- Conduit fittings ---
  const fittingCount = Math.ceil(conduitLength / 3);
  const codoMatch = matchPriceItem(priceItems, "CANALIZACION", "Accesorio", ["codo"]);
  const codoCost = codoMatch?.unitCost ?? getEstimatedCost("codo");
  if (fittingCount > 0) {
    items.push(
      makeLineItem(idx++, "5.7.4", "ACCESO", "ACC-CODO-001", "Codo conduit 3/4\" 90°", "pza", fittingCount, codoCost, "Accesorio", !codoMatch)
    );
  }

  // --- Labor ---
  const laborMatch = matchPriceItem(priceItems, "ACCESO", "Mano de Obra", ["mano de obra", "instalación"]);
  const laborCost = laborMatch?.unitCost ?? getEstimatedCost("labor_access");
  items.push(
    makeLineItem(idx++, "5.7.4", "ACCESO", "ACC-MO-001", "Instalación de sistema de control de acceso (mano de obra)", "lote", 1, laborCost * totalDevices, "Mano de Obra", !laborMatch)
  );

  const sums = sumLineItems(items);
  return { ...sums, lineItems: items };
}

export function calculatePaging(
  config: PagingConfig,
  factors: EstimateFactors,
  priceItems: PriceItemRecord[]
): SystemBreakdown {
  const items: LineItem[] = [];
  let idx = 1;

  const totalSpeakers = config.speakers.reduce((s, sp) => s + sp.qty, 0) + config.bluetoothSpeakers;
  const totalDevices = totalSpeakers + config.amplifiers.qty + config.gateways;

  // Cable
  const cableLength = round2(
    (config.avgDistanceMeters + factors.verticalDrop + factors.rackAllowance) * totalDevices * (1 + factors.wasteFactorCable)
  );

  // Conduit
  const conduitLength = round2(config.avgDistanceMeters * totalDevices * (1 + factors.wasteFactorConduit));

  // --- Speakers ---
  for (const sp of config.speakers) {
    const typeLower = sp.type.toLowerCase();
    const keywords: string[] = [];
    if (typeLower.includes("exterior")) keywords.push("exterior", "bafle", "protección");
    else if (typeLower.includes("colgante")) keywords.push("colgante", "techo");
    else if (typeLower.includes("ip")) keywords.push("ip", "altavoz ip");

    const matched = matchPriceItem(priceItems, "VOCEO", "Equipo", keywords);
    const cost = matched?.unitCost ?? getEstimatedCost("paging_speaker_" + typeLower);
    items.push(
      makeLineItem(idx++, "5.7.5", "VOCEO", `VOC-SPK-${String(idx).padStart(3, "0")}`, `Altavoz ${sp.type} para sistema de voceo`, "pza", sp.qty, cost, "Equipo", !matched)
    );
  }

  // --- Bluetooth Speakers ---
  if (config.bluetoothSpeakers > 0) {
    const btMatch = matchPriceItem(priceItems, "VOCEO", "Equipo", ["bluetooth", "inalámbrico"]);
    const btCost = btMatch?.unitCost ?? getEstimatedCost("paging_speaker_bluetooth");
    items.push(
      makeLineItem(idx++, "5.7.5", "VOCEO", "VOC-BT-001", "Altavoz bluetooth", "pza", config.bluetoothSpeakers, btCost, "Equipo", !btMatch)
    );
  }

  // --- Amplifiers ---
  const ampMatch = matchPriceItem(priceItems, "VOCEO", "Equipo", ["amplificador"]);
  const ampCost = ampMatch?.unitCost ?? getEstimatedCost("paging_amplifier");
  items.push(
    makeLineItem(idx++, "5.7.5", "VOCEO", "VOC-AMP-001", `Amplificador ${config.amplifiers.watts}W para voceo`, "pza", config.amplifiers.qty, ampCost, "Equipo", !ampMatch)
  );

  // --- Gateways ---
  const gwMatch = matchPriceItem(priceItems, "VOCEO", "Equipo", ["gateway", "pasarela"]);
  const gwCost = gwMatch?.unitCost ?? getEstimatedCost("paging_gateway");
  items.push(
    makeLineItem(idx++, "5.7.5", "VOCEO", "VOC-GW-001", "Gateway VoIP para voceo", "pza", config.gateways, gwCost, "Equipo", !gwMatch)
  );

  // --- Cable ---
  const cableMatch = matchPriceItem(priceItems, "CABLEADO", "Equipo", ["UTP", "cable UTP", "cable Cat"]);
  const cableCost = cableMatch?.unitCost ?? getEstimatedCost("cable_utp");
  items.push(
    makeLineItem(idx++, "5.7.5", "VOCEO", "VOC-CAB-001", "Cable UTP Cat6 para voceo", "ml", cableLength, cableCost, "Equipo", !cableMatch)
  );

  // --- Speaker wire (alternating) ---
  const speakerWireLength = round2(cableLength * 0.5); // speaker wire only for analog portions
  const spkWireMatch = matchPriceItem(priceItems, "CABLEADO", "Equipo", ["parlante", "altavoz", "bocina", "speaker wire"]);
  const spkWireCost = spkWireMatch?.unitCost ?? getEstimatedCost("cable_speaker");
  items.push(
    makeLineItem(idx++, "5.7.5", "VOCEO", "VOC-SWK-001", "Cable para altavoz", "ml", speakerWireLength, spkWireCost, "Equipo", !spkWireMatch)
  );

  // --- Conduit ---
  const conduitMatch = matchPriceItem(priceItems, "CANALIZACION", "Equipo", ["conduit", "tubo"]);
  const conduitCost = conduitMatch?.unitCost ?? getEstimatedCost("conduit");
  items.push(
    makeLineItem(idx++, "5.7.5", "VOCEO", "VOC-CON-001", "Conduit 3/4\" para voceo", "ml", conduitLength, conduitCost, "Equipo", !conduitMatch)
  );

  // --- Conduit fittings ---
  const fittingCount = Math.ceil(conduitLength / 3);
  const codoMatch = matchPriceItem(priceItems, "CANALIZACION", "Accesorio", ["codo"]);
  const codoCost = codoMatch?.unitCost ?? getEstimatedCost("codo");
  if (fittingCount > 0) {
    items.push(
      makeLineItem(idx++, "5.7.5", "VOCEO", "VOC-CODO-001", "Codo conduit 3/4\" 90°", "pza", fittingCount, codoCost, "Accesorio", !codoMatch)
    );
  }

  // --- Labor ---
  const laborMatch = matchPriceItem(priceItems, "VOCEO", "Mano de Obra", ["mano de obra", "instalación"]);
  const laborCost = laborMatch?.unitCost ?? getEstimatedCost("labor_paging");
  items.push(
    makeLineItem(idx++, "5.7.5", "VOCEO", "VOC-MO-001", "Instalación de sistema de voceo (mano de obra)", "lote", 1, laborCost * totalDevices, "Mano de Obra", !laborMatch)
  );

  const sums = sumLineItems(items);
  return { ...sums, lineItems: items };
}

export function calculateFire(
  config: FireConfig,
  factors: EstimateFactors,
  priceItems: PriceItemRecord[]
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
    const match = matchPriceItem(priceItems, "INCENDIO", "Equipo", ["humo", "detector", "smoke"]);
    const cost = match?.unitCost ?? getEstimatedCost("fire_smoke_detector");
    items.push(
      makeLineItem(idx++, "5.7.6", "INCENDIO", "FIR-SMK-001", "Detector de humo fotoeléctrico", "pza", config.smokeDetectors, cost, "Equipo", !match)
    );
  }

  // --- Heat Detectors ---
  if (config.heatDetectors > 0) {
    const match = matchPriceItem(priceItems, "INCENDIO", "Equipo", ["temperatura", "calor", "heat"]);
    const cost = match?.unitCost ?? getEstimatedCost("fire_heat_detector");
    items.push(
      makeLineItem(idx++, "5.7.6", "INCENDIO", "FIR-HEAT-001", "Detector de temperatura", "pza", config.heatDetectors, cost, "Equipo", !match)
    );
  }

  // --- Manual Stations ---
  if (config.manualStations > 0) {
    const match = matchPriceItem(priceItems, "INCENDIO", "Equipo", ["estación manual", "pulsador", "manual"]);
    const cost = match?.unitCost ?? getEstimatedCost("fire_manual_station");
    items.push(
      makeLineItem(idx++, "5.7.6", "INCENDIO", "FIR-MS-001", "Estación manual de alarma", "pza", config.manualStations, cost, "Equipo", !match)
    );
  }

  // --- Strobes ---
  if (config.strobes > 0) {
    const match = matchPriceItem(priceItems, "INCENDIO", "Equipo", ["estroboscópica", "estrobo", "strobe"]);
    const cost = match?.unitCost ?? getEstimatedCost("fire_strobe");
    items.push(
      makeLineItem(idx++, "5.7.6", "INCENDIO", "FIR-STR-001", "Lámpara estroboscópica", "pza", config.strobes, cost, "Equipo", !match)
    );
  }

  // --- Horn Strobes ---
  if (config.hornStrobes > 0) {
    const match = matchPriceItem(priceItems, "INCENDIO", "Equipo", ["horn strobe", "campana", "sirena"]);
    const cost = match?.unitCost ?? getEstimatedCost("fire_horn_strobe");
    items.push(
      makeLineItem(idx++, "5.7.6", "INCENDIO", "FIR-HS-001", "Dispositivo audible/visible (horn strobe)", "pza", config.hornStrobes, cost, "Equipo", !match)
    );
  }

  // --- CO Detectors ---
  if (config.coDetectors > 0) {
    const match = matchPriceItem(priceItems, "INCENDIO", "Equipo", ["CO", "monóxido", "carbono"]);
    const cost = match?.unitCost ?? getEstimatedCost("fire_co_detector");
    items.push(
      makeLineItem(idx++, "5.7.6", "INCENDIO", "FIR-CO-001", "Detector de monóxido de carbono", "pza", config.coDetectors, cost, "Equipo", !match)
    );
  }

  // --- Panels ---
  const panelMatch = matchPriceItem(priceItems, "INCENDIO", "Equipo", ["panel", "central"]);
  const panelCost = panelMatch?.unitCost ?? getEstimatedCost("fire_panel");
  items.push(
    makeLineItem(idx++, "5.7.6", "INCENDIO", "FIR-PNL-001", `Panel de alarma contra incendio ${config.panels.loops} lazos`, "pza", config.panels.qty, panelCost, "Equipo", !panelMatch)
  );

  // --- Annunciators ---
  if (config.annunciators > 0) {
    const annMatch = matchPriceItem(priceItems, "INCENDIO", "Equipo", ["anunciador", "indicador"]);
    const annCost = annMatch?.unitCost ?? getEstimatedCost("fire_annunciator");
    items.push(
      makeLineItem(idx++, "5.7.6", "INCENDIO", "FIR-ANN-001", "Anunciador remoto", "pza", config.annunciators, annCost, "Equipo", !annMatch)
    );
  }

  // --- Cable FPLR ---
  const fplrMatch = matchPriceItem(priceItems, "CABLEADO", "Equipo", ["FPLR", "fire", "incendio", "resistente al fuego"]);
  const fplrCost = fplrMatch?.unitCost ?? getEstimatedCost("cable_fplr");
  items.push(
    makeLineItem(idx++, "5.7.6", "INCENDIO", "FIR-CAB-001", "Cable FPLR para sistema contra incendio", "ml", cableLength, fplrCost, "Equipo", !fplrMatch)
  );

  // --- Conduit ---
  const conduitMatch = matchPriceItem(priceItems, "CANALIZACION", "Equipo", ["conduit", "tubo"]);
  const conduitCost = conduitMatch?.unitCost ?? getEstimatedCost("conduit");
  items.push(
    makeLineItem(idx++, "5.7.6", "INCENDIO", "FIR-CON-001", "Conduit 3/4\" para sistema contra incendio", "ml", conduitLength, conduitCost, "Equipo", !conduitMatch)
  );

  // --- Conduit fittings ---
  const fittingCount = Math.ceil(conduitLength / 3);
  const codoMatch = matchPriceItem(priceItems, "CANALIZACION", "Accesorio", ["codo"]);
  const codoCost = codoMatch?.unitCost ?? getEstimatedCost("codo");
  if (fittingCount > 0) {
    items.push(
      makeLineItem(idx++, "5.7.6", "INCENDIO", "FIR-CODO-001", "Codo conduit 3/4\" 90°", "pza", fittingCount, codoCost, "Accesorio", !codoMatch)
    );
  }

  // --- Labor ---
  const laborMatch = matchPriceItem(priceItems, "INCENDIO", "Mano de Obra", ["mano de obra", "instalación"]);
  const laborCost = laborMatch?.unitCost ?? getEstimatedCost("labor_fire");
  items.push(
    makeLineItem(idx++, "5.7.6", "INCENDIO", "FIR-MO-001", "Instalación de sistema contra incendio (mano de obra)", "lote", 1, laborCost * totalDevices, "Mano de Obra", !laborMatch)
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
    cctv_nvr: 45600.0,
    cctv_disk: 5200.0,
    cctv_license: 850.0,
    cable_utp: 28.5,
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
  factors: EstimateFactors;
  priceItems: PriceItemRecord[];
}): CalculationResult {
  const { cctvConfig, accessConfig, pagingConfig, fireConfig, factors, priceItems } = params;

  const systems: Record<string, SystemBreakdown> = {};
  const allLineItems: LineItem[] = [];

  if (cctvConfig && cctvConfig.cameras?.length > 0) {
    systems["CCTV"] = calculateCCTV(cctvConfig, factors, priceItems);
    allLineItems.push(...systems["CCTV"].lineItems);
  }

  if (accessConfig && accessConfig.doors > 0) {
    systems["ACCESO"] = calculateAccess(accessConfig, factors, priceItems);
    allLineItems.push(...systems["ACCESO"].lineItems);
  }

  if (pagingConfig && (pagingConfig.speakers?.length > 0 || pagingConfig.bluetoothSpeakers > 0)) {
    systems["VOCEO"] = calculatePaging(pagingConfig, factors, priceItems);
    allLineItems.push(...systems["VOCEO"].lineItems);
  }

  if (fireConfig && (fireConfig.smokeDetectors > 0 || fireConfig.heatDetectors > 0 || fireConfig.manualStations > 0)) {
    systems["INCENDIO"] = calculateFire(fireConfig, factors, priceItems);
    allLineItems.push(...systems["INCENDIO"].lineItems);
  }

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

  const subtotalMaterials = round2(allLineItems.filter((i) => i.category === "Equipo" || i.category === "Accesorio" || i.category === "Consumible").reduce((s, i) => s + i.totalAmount, 0));
  const subtotalLabor = round2(allLineItems.filter((i) => i.category === "Mano de Obra").reduce((s, i) => s + i.totalAmount, 0));
  const subtotalEngineering = round2(allLineItems.filter((i) => i.category === "Ingeniería").reduce((s, i) => s + i.totalAmount, 0));
  const subtotalServices = round2(allLineItems.filter((i) => i.category === "Servicio").reduce((s, i) => s + i.totalAmount, 0));

  const subtotalDirect = round2(subtotalMaterials + subtotalLabor + subtotalEngineering + subtotalServices);
  const subtotalIndirects = round2(subtotalDirect * factors.indirectFactor);
  const subtotalUtility = round2((subtotalDirect + subtotalIndirects) * factors.utilityFactor);
  const grandTotal = round2(subtotalDirect + subtotalIndirects + subtotalUtility);

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
    lineItems: allLineItems,
  };
}