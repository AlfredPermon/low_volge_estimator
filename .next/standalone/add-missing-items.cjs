const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  // Create new price items for missing components
  const newItems = [
    {
      sku: 'CCTV-SWITCH-048',
      system: 'CCTV',
      category: 'Equipo',
      brand: 'UBIQUITI',
      model: 'USW-PRO-48-POE',
      description: 'UniFi Switch USW-Pro-48-POE Gen2, Capa 3 de 48 puertos PoE 802.3at/bt + 4 puertos 1/10G SFP+, 600W, pantalla informativa',
      unit: 'PZA',
      unitCost: 28250.00,
      performance: 0,
      deviceType: 'switch'
    },
    {
      sku: 'CCTV-SWITCH-024',
      system: 'CCTV',
      category: 'Equipo',
      brand: 'UBIQUITI',
      model: 'USW-PRO-24-POE',
      description: 'UniFi Switch USW-Pro-24-POE Gen2, con funciones capa 3, de 24 puertos PoE 802.3at/bt + 2 puertos 1/10G SFP+, 400W, pantalla informativa',
      unit: 'PZA',
      unitCost: 18937.50,
      performance: 0,
      deviceType: 'switch'
    },
    {
      sku: 'CCTV-DISPLAY-055',
      system: 'CCTV',
      category: 'Equipo',
      brand: 'SAMSUNG',
      model: 'QB55C',
      description: 'Pantalla Comercial LED 55", 4K Ultra HD Negro con base para montaje en pared Samsung QB55C',
      unit: 'PZA',
      unitCost: 19514.40,
      performance: 0,
      deviceType: 'display'
    },
    {
      sku: 'CCTV-UPS-2000',
      system: 'CCTV',
      category: 'Equipo',
      brand: 'LINKEDPRO',
      model: 'LP2KRT',
      description: 'UPS 2000VA/1800W Topología On-Line Doble Conversión Entrada y Salida de 120 Vca Torre',
      unit: 'PZA',
      unitCost: 15895.50,
      performance: 0,
      deviceType: 'ups'
    },
    {
      sku: 'CCTV-PATCH-048',
      system: 'CCTV',
      category: 'Accesorio',
      brand: 'PANDUIT',
      model: 'DP48688TGY',
      description: 'Patch Panel de 48 Puertos 110-MOD 8W8P CAT 6, Negro 2RU',
      unit: 'PZA',
      unitCost: 12999.17,
      performance: 0,
      deviceType: 'patch_panel'
    },
    {
      sku: 'CCTV-RACK-2P',
      system: 'CCTV',
      category: 'Accesorio',
      brand: 'PANDUIT',
      model: 'R2P',
      description: 'Rack de dos postes 7 x 19 abierto marca Panduit',
      unit: 'PZA',
      unitCost: 6800.00,
      performance: 0,
      deviceType: 'rack'
    },
    {
      sku: 'CCTV-ORG-VERT',
      system: 'CCTV',
      category: 'Accesorio',
      brand: 'PANDUIT',
      model: 'WMPV45E',
      description: 'Organizador Vertical NetRunner, Doble Frontal y Posterior, Para Rack Abierto de 45U',
      unit: 'PZA',
      unitCost: 7200.00,
      performance: 0,
      deviceType: 'organizer'
    },
    {
      sku: 'CCTV-ORG-HORZ',
      system: 'CCTV',
      category: 'Accesorio',
      brand: 'PANDUIT',
      model: 'WMP1E',
      description: 'Organizador de Cables Horizontal PatchLink, Doble Frontal y Posterior, Para Rack de 19in, 2UR',
      unit: 'PZA',
      unitCost: 1920.15,
      performance: 0,
      deviceType: 'organizer'
    },
    {
      sku: 'CCTV-PDU-12',
      system: 'CCTV',
      category: 'Accesorio',
      brand: 'CYBERPOWER',
      model: 'PDU-12POS',
      description: 'PDU 127AC 15A 12POS CyberPower',
      unit: 'PZA',
      unitCost: 1552.75,
      performance: 0,
      deviceType: 'pdu'
    }
  ];

  console.log('=== Agregando items faltantes al catálogo ===\n');
  
  for (const item of newItems) {
    try {
      // Check if already exists
      const existing = await db.priceItem.findFirst({
        where: { sku: item.sku }
      });
      
      if (existing) {
        console.log(`SKIP: ${item.sku} ya existe`);
      } else {
        const created = await db.priceItem.create({
          data: item
        });
        console.log(`CREATE: ${item.sku} - ${item.brand} ${item.model} - $${item.unitCost}`);
      }
    } catch (err) {
      console.error(`ERROR ${item.sku}: ${err.message}`);
    }
  }

  console.log('\n=== Proceso completado ===');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
