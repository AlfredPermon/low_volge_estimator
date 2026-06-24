import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── Default price items (realistic MXN prices) ─────────────────────────────

const DEFAULT_ITEMS = [
  // ── CCTV ──────────────────────────────────────────────────────────────
  { sku: "CCTV-CAM-BUL", system: "CCTV", category: "Equipo", brand: "Hikvision", model: "DS-2CD2T87G2", description: "Cámara IP Bullet exterior 5MP WDR PoE Hikvision DS-2CD2T87G2", unit: "pza", unitCost: 7805.18, performance: 0 },
  { sku: "CCTV-CAM-DOM", system: "CCTV", category: "Equipo", brand: "Hikvision", model: "DS-2CD2387G2", description: "Cámara IP Domo interior 8MP WDR PoE Hikvision DS-2CD2387G2", unit: "pza", unitCost: 8210.45, performance: 0 },
  { sku: "CCTV-CAM-PTZ", system: "CCTV", category: "Equipo", brand: "Hikvision", model: "DS-2DE7A432IW", description: "Cámara IP PTZ 4MP 32X zoom exterior PoE Hikvision DS-2DE7A432IW", unit: "pza", unitCost: 28500.0, performance: 0 },
  { sku: "CCTV-CAM-FIS", system: "CCTV", category: "Equipo", brand: "Hikvision", model: "DS-2CD6365G0E", description: "Cámara IP Fisheye 12MP interior Hikvision DS-2CD6365G0E", unit: "pza", unitCost: 15200.0, performance: 0 },
  { sku: "CCTV-NVR-016", system: "CCTV", category: "Equipo", brand: "Hikvision", model: "DS-7616NI-Q2", description: "NVR 16 canales 2 bahías H.265+ Hikvision DS-7616NI-Q2", unit: "pza", unitCost: 45600.0, performance: 0 },
  { sku: "CCTV-DISK-10T", system: "CCTV", category: "Equipo", brand: "Seagate", model: "ST10000VN000", description: "Disco duro Surveillance 10TB Seagate SkyHawk", unit: "pza", unitCost: 5200.0, performance: 0 },
  { sku: "CCTV-LIC-001", system: "CCTV", category: "Equipo", brand: "Hikvision", model: "License", description: "Licencia de cámara IP adicional Hikvision", unit: "pza", unitCost: 850.0, performance: 0 },
  { sku: "CCTV-MO-001", system: "CCTV", category: "Mano de Obra", brand: "", model: "", description: "Mano de obra instalación de cámara IP", unit: "pza", unitCost: 450.0, performance: 3 },

  // ── ACCESO ────────────────────────────────────────────────────────────
  { sku: "ACC-TER-BIO", system: "ACCESO", category: "Equipo", brand: "HID", model: "iCLASS SE", description: "Terminal de acceso biométrica huella + tarjeta HID iCLASS SE", unit: "pza", unitCost: 9800.0, performance: 0 },
  { sku: "ACC-TER-RFID", system: "ACCESO", category: "Equipo", brand: "HID", model: "R40", description: "Terminal de acceso RFID lectura prox HID R40", unit: "pza", unitCost: 4200.0, performance: 0 },
  { sku: "ACC-CTR-002", system: "ACCESO", category: "Equipo", brand: "HID", model: "VertX E400", description: "Controlador de acceso 2 puertas IP HID VertX E400", unit: "pza", unitCost: 12500.0, performance: 0 },
  { sku: "ACC-TSR-001", system: "ACCESO", category: "Equipo", brand: "Boon Edam", model: "Turnstile 200", description: "Torniquete de acceso trípode acabado inoxidable", unit: "pza", unitCost: 35000.0, performance: 0 },
  { sku: "ACC-LOC-280", system: "ACCESO", category: "Equipo", brand: "Securitron", model: "MAG-280", description: "Cerradura magnética 280lb para puerta de vidrio", unit: "pza", unitCost: 2850.0, performance: 0 },
  { sku: "ACC-BTN-001", system: "ACCESO", category: "Equipo", brand: "Securitron", model: "BSP-1", description: "Botón de salida embebido simple", unit: "pza", unitCost: 285.0, performance: 0 },
  { sku: "ACC-BTN-TL", system: "ACCESO", category: "Equipo", brand: "Securitron", model: "BTS-1", description: "Botón de salida touchless (sin contacto)", unit: "pza", unitCost: 650.0, performance: 0 },
  { sku: "ACC-SW-LIC", system: "ACCESO", category: "Equipo", brand: "HID", model: "Software", description: "Licencia de software de gestión de acceso", unit: "pza", unitCost: 2200.0, performance: 0 },
  { sku: "ACC-MO-001", system: "ACCESO", category: "Mano de Obra", brand: "", model: "", description: "Mano de obra instalación de punto de acceso", unit: "pza", unitCost: 380.0, performance: 2.5 },

  // ── VOCEO ─────────────────────────────────────────────────────────────
  { sku: "VOC-SPK-EXT", system: "VOCEO", category: "Equipo", brand: "Bosch", model: "LBC3096/41", description: "Altavoz de bocina exterior 15W protección IP66 Bosch LBC3096/41", unit: "pza", unitCost: 3200.0, performance: 0 },
  { sku: "VOC-SPK-COL", system: "VOCEO", category: "Equipo", brand: "Bosch", model: "LBC3090/41", description: "Altavoz colgante de techo 6W blanco Bosch", unit: "pza", unitCost: 2800.0, performance: 0 },
  { sku: "VOC-SPK-IP", system: "VOCEO", category: "Equipo", brand: "Bosch", model: "LBC3420/12", description: "Altavoz IP 10W con placa de techo Bosch", unit: "pza", unitCost: 5500.0, performance: 0 },
  { sku: "VOC-SPK-BT", system: "VOCEO", category: "Equipo", brand: "Bosch", model: "PLN-ULP1", description: "Altavoz Bluetooth inalámbrico para zonas abiertas", unit: "pza", unitCost: 4200.0, performance: 0 },
  { sku: "VOC-AMP-120", system: "VOCEO", category: "Equipo", brand: "Bosch", model: "PRA-ULPCA4", description: "Amplificador de 120W 4 zonas para sistema de voceo", unit: "pza", unitCost: 8500.0, performance: 0 },
  { sku: "VOC-GW-001", system: "VOCEO", category: "Equipo", brand: "Bosch", model: "PRA-ULPL6", description: "Gateway VoIP para sistema de voceo IP Bosch", unit: "pza", unitCost: 12000.0, performance: 0 },
  { sku: "VOC-MO-001", system: "VOCEO", category: "Mano de Obra", brand: "", model: "", description: "Mano de obra instalación de punto de voceo", unit: "pza", unitCost: 350.0, performance: 3 },

  // ── INCENDIO ──────────────────────────────────────────────────────────
  { sku: "FIR-SMK-001", system: "INCENDIO", category: "Equipo", brand: "Hochiki", model: "SLG-E", description: "Detector de humo fotoeléctrico inteligente Hochiki SLG-E", unit: "pza", unitCost: 1450.0, performance: 0 },
  { sku: "FIR-HEAT-001", system: "INCENDIO", category: "Equipo", brand: "Hochiki", model: "DCC-E", description: "Detector de temperatura fija 58°C Hochiki DCC-E", unit: "pza", unitCost: 1200.0, performance: 0 },
  { sku: "FIR-MS-001", system: "INCENDIO", category: "Equipo", brand: "Hochiki", model: "MCP-E", description: "Estación manual de alarma contra incendio Hochiki MCP-E", unit: "pza", unitCost: 680.0, performance: 0 },
  { sku: "FIR-STR-001", system: "INCENDIO", category: "Equipo", brand: "Hochiki", model: "SLR-24H-E3", description: "Lámpara estroboscópica 24VCD Hochiki", unit: "pza", unitCost: 850.0, performance: 0 },
  { sku: "FIR-HS-001", system: "INCENDIO", category: "Equipo", brand: "Hochiki", model: "CHG-E", description: "Dispositivo audible/visible (horn strobe) 24VCD Hochiki CHG-E", unit: "pza", unitCost: 1150.0, performance: 0 },
  { sku: "FIR-CO-001", system: "INCENDIO", category: "Equipo", brand: "Hochiki", model: "COC-E", description: "Detector de monóxido de carbono electroquímico Hochiki COC-E", unit: "pza", unitCost: 2800.0, performance: 0 },
  { sku: "FIR-PNL-004", system: "INCENDIO", category: "Equipo", brand: "Hochiki", model: "HFP-4L-E", description: "Panel de alarma contra incendio 4 lazos analógico Hochiki HFP-4L-E", unit: "pza", unitCost: 68000.0, performance: 0 },
  { sku: "FIR-ANN-001", system: "INCENDIO", category: "Equipo", brand: "Hochiki", model: "ANN-80LED", description: "Anunciador remoto 80 zonas LED Hochiki", unit: "pza", unitCost: 8500.0, performance: 0 },
  { sku: "FIR-MO-001", system: "INCENDIO", category: "Mano de Obra", brand: "", model: "", description: "Mano de obra instalación de dispositivo contra incendio", unit: "pza", unitCost: 420.0, performance: 2 },

  // ── CABLEADO ──────────────────────────────────────────────────────────
  { sku: "CAB-UTP-C6", system: "CABLEADO", category: "Equipo", brand: "General Cable", model: "Cat6 UTP", description: "Cable UTP Cat6 23AWG 4 pares CMR", unit: "ml", unitCost: 28.5, performance: 0 },
  { sku: "CAB-UTP-CS", system: "CABLEADO", category: "Equipo", brand: "General Cable", model: "Cat6 STP", description: "Cable UTP Cat6 STP apantallado 23AWG 4 pares", unit: "ml", unitCost: 38.0, performance: 0 },
  { sku: "CAB-FPLR-14", system: "CABLEADO", category: "Equipo", brand: "General Cable", model: "FPLR 14AWG", description: "Cable FPLR resistente al fuego 14AWG 2 conductores", unit: "ml", unitCost: 42.0, performance: 0 },
  { sku: "CAB-FPLP-14", system: "CABLEADO", category: "Equipo", brand: "General Cable", model: "FPLP 14AWG", description: "Cable FPLP plenum resistente al fuego 14AWG", unit: "ml", unitCost: 58.0, performance: 0 },
  { sku: "CAB-SPK-2X", system: "CABLEADO", category: "Equipo", brand: "Belden", model: "8471", description: "Cable para altavoz 2x1.5mm²", unit: "ml", unitCost: 18.0, performance: 0 },
  { sku: "CAB-MO-001", system: "CABLEADO", category: "Mano de Obra", brand: "", model: "", description: "Mano de obra instalación de cableado (tendido)", unit: "ml", unitCost: 12.0, performance: 80 },

  // ── CANALIZACIÓN ──────────────────────────────────────────────────────
  { sku: "CAN-CON-3/4", system: "CANALIZACION", category: "Equipo", brand: "Tycab", model: "PVC 3/4\"", description: "Conduit rígido PVC tipo pesado 3/4\" schedule 40", unit: "ml", unitCost: 38.5, performance: 0 },
  { sku: "CAN-CON-1", system: "CANALIZACION", category: "Equipo", brand: "Tycab", model: "PVC 1\"", description: "Conduit rígido PVC tipo pesado 1\" schedule 40", unit: "ml", unitCost: 52.0, performance: 0 },
  { sku: "CAN-COD-3/4", system: "CANALIZACION", category: "Accesorio", brand: "Tycab", model: "Codo 3/4\"", description: "Codo conduit PVC 3/4\" 90°", unit: "pza", unitCost: 15.0, performance: 0 },
  { sku: "CAN-COPL-3/4", system: "CANALIZACION", category: "Accesorio", brand: "Tycab", model: "Cople 3/4\"", description: "Cople conduit PVC 3/4\"", unit: "pza", unitCost: 12.0, performance: 0 },
  { sku: "CAN-CONEC-3/4", system: "CANALIZACION", category: "Accesorio", brand: "Tycab", model: "Conector 3/4\"", description: "Conector conduit PVC 3/4\" tipo compresión", unit: "pza", unitCost: 22.0, performance: 0 },
  { sku: "CAN-SOP-UNI", system: "CANALIZACION", category: "Accesorio", brand: "Panduit", model: "Soporte", description: "Soporte unipar conduit con tornillo", unit: "pza", unitCost: 65.0, performance: 0 },
  { sku: "CAN-CAJ-PEQ", system: "CANALIZACION", category: "Accesorio", brand: "Legrand", model: "Caja 4x4", description: "Caja de connection 4x4 profundidad 1-1/2\"", unit: "pza", unitCost: 185.0, performance: 0 },
  { sku: "CAN-TAPA-PEQ", system: "CANALIZACION", category: "Accesorio", brand: "Legrand", model: "Tapa", description: "Tapa de placa para caja 4x4", unit: "pza", unitCost: 95.0, performance: 0 },
  { sku: "CAN-PLICA", system: "CANALIZACION", category: "Equipo", brand: "Tycab", model: "Flexible", description: "Flexible metálico plica 3/4\" con acoplamiento", unit: "ml", unitCost: 45.0, performance: 0 },
  { sku: "CAN-MO-001", system: "CANALIZACION", category: "Mano de Obra", brand: "", model: "", description: "Mano de obra instalación de canalización (conduit)", unit: "ml", unitCost: 18.0, performance: 50 },

  // ── GENERAL / SERVICIOS ───────────────────────────────────────────────
  { sku: "SRV-PEM", system: "GENERAL", category: "Servicio", brand: "", model: "", description: "Puesta en marcha y programación de sistemas de baja tensión", unit: "lote", unitCost: 15000.0, performance: 0 },
  { sku: "SRV-CAP", system: "GENERAL", category: "Servicio", brand: "", model: "", description: "Capacitación al cliente en uso de sistemas instalados", unit: "lote", unitCost: 8000.0, performance: 0 },
  { sku: "SRV-PLN", system: "GENERAL", category: "Servicio", brand: "", model: "", description: "Planos as-built de sistemas de baja tensión", unit: "lote", unitCost: 12000.0, performance: 0 },
];

// ─── POST: Seed default price items if database is empty ───────────────────

export async function POST() {
  try {
    const count = await db.priceItem.count();

    if (count > 0) {
      return NextResponse.json({
        message: "Database already has price items, skipping seed",
        existing: count,
      });
    }

    let created = 0;
    for (const item of DEFAULT_ITEMS) {
      await db.priceItem.create({ data: item });
      created++;
    }

    return NextResponse.json({
      message: "Default price items seeded successfully",
      created,
    });
  } catch (error) {
    console.error("Error seeding defaults:", error);
    return NextResponse.json({ error: "Failed to seed defaults" }, { status: 500 });
  }
}