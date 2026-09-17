const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const estimate = await db.estimate.findFirst({
    where: { name: { contains: 'UPAEP' } }
  });

  if (!estimate) {
    console.log('No se encontró UPAEP');
    return;
  }

  // Get current line items
  let items = JSON.parse(estimate.lineItems || '[]');
  
  // Find the highest partida number in CCTV
  let maxPartidaNum = 0;
  items.forEach(item => {
    if (item.system === 'CCTV') {
      const parts = item.partida.split('.');
      const num = parseInt(parts[parts.length - 1]);
      if (num > maxPartidaNum) maxPartidaNum = num;
    }
  });
  console.log('Max partida CCTV:', maxPartidaNum);

  // New items to add based on the proposal
  // Note: We already have most items, we need to ADD the switches, display, UPS, rack accessories
  const newItemsToAdd = [
    {
      // Switch 48 puertos PoE - 1 pza
      partida: '5.7.3.12',
      code: 'CCTV-SWITCH-048',
      description: 'UniFi Switch USW-Pro-48-POE Gen2, Capa 3 de 48 puertos PoE 802.3at/bt + 4 puertos 1/10G SFP+, 600W, pantalla informativa',
      unit: 'PZA',
      quantity: 1,
      unitCost: 28250.00,
      system: 'CCTV',
      category: 'Equipo',
      marca: 'UBIQUITI',
      modelo: 'USW-PRO-48-POE'
    },
    {
      // Switch 24 puertos PoE - 1 pza
      partida: '5.7.3.13',
      code: 'CCTV-SWITCH-024',
      description: 'UniFi Switch USW-Pro-24-POE Gen2, con funciones capa 3, de 24 puertos PoE 802.3at/bt + 2 puertos 1/10G SFP+, 400W, pantalla informativa',
      unit: 'PZA',
      quantity: 1,
      unitCost: 18937.50,
      system: 'CCTV',
      category: 'Equipo',
      marca: 'UBIQUITI',
      modelo: 'USW-PRO-24-POE'
    },
    {
      // Display Samsung 55" - 1 pza
      partida: '5.7.3.14',
      code: 'CCTV-DISPLAY-055',
      description: 'Pantalla Comercial LED 55", 4K Ultra HD Negro con base para montaje en pared Samsung QB55C',
      unit: 'PZA',
      quantity: 1,
      unitCost: 19514.40,
      system: 'CCTV',
      category: 'Equipo',
      marca: 'SAMSUNG',
      modelo: 'QB55C'
    },
    {
      // UPS 2000VA - 1 pza
      partida: '5.7.3.15',
      code: 'CCTV-UPS-2000',
      description: 'UPS 2000VA/1800W Topología On-Line Doble Conversión Entrada y Salida de 120 Vca Torre',
      unit: 'PZA',
      quantity: 1,
      unitCost: 15895.50,
      system: 'CCTV',
      category: 'Equipo',
      marca: 'LINKEDPRO',
      modelo: 'LP2KRT'
    },
    {
      // Patch Panel 48 puertos - 2 pzas
      partida: '5.7.3.16',
      code: 'CCTV-PATCH-048',
      description: 'Patch Panel de 48 Puertos 110-MOD 8W8P CAT 6, Negro 2RU',
      unit: 'PZA',
      quantity: 2,
      unitCost: 12999.17,
      system: 'CCTV',
      category: 'Accesorio',
      marca: 'PANDUIT',
      modelo: 'DP48688TGY'
    },
    {
      // Rack de dos postes - 1 pza
      partida: '5.7.3.17',
      code: 'CCTV-RACK-2P',
      description: 'Rack de dos postes 7 x 19 abierto marca Panduit',
      unit: 'PZA',
      quantity: 1,
      unitCost: 6800.00,
      system: 'CCTV',
      category: 'Accesorio',
      marca: 'PANDUIT',
      modelo: 'R2P'
    },
    {
      // Organizador Vertical - 2 pzas
      partida: '5.7.3.18',
      code: 'CCTV-ORG-VERT',
      description: 'Organizador Vertical NetRunner, Doble Frontal y Posterior, Para Rack Abierto de 45U',
      unit: 'PZA',
      quantity: 2,
      unitCost: 7200.00,
      system: 'CCTV',
      category: 'Accesorio',
      marca: 'PANDUIT',
      modelo: 'WMPV45E'
    },
    {
      // Organizador Horizontal - 2 pzas
      partida: '5.7.3.19',
      code: 'CCTV-ORG-HORZ',
      description: 'Organizador de Cables Horizontal PatchLink, Doble Frontal y Posterior, Para Rack de 19in, 2UR',
      unit: 'PZA',
      quantity: 2,
      unitCost: 1920.15,
      system: 'CCTV',
      category: 'Accesorio',
      marca: 'PANDUIT',
      modelo: 'WMP1E'
    },
    {
      // PDU 12 tomas - 1 pza
      partida: '5.7.3.20',
      code: 'CCTV-PDU-12',
      description: 'PDU 127AC 15A 12POS CyberPower',
      unit: 'PZA',
      quantity: 1,
      unitCost: 1552.75,
      system: 'CCTV',
      category: 'Accesorio',
      marca: 'CYBERPOWER',
      modelo: 'PDU-12POS'
    }
  ];

  console.log('=== Agregando items faltantes al presupuesto ===\n');

  // Add new items with calculated totals
  const indirectRate = estimate.indirectFactor || 0.12;
  const utilityRate = estimate.utilityFactor || 0.15;
  
  // For equipment items, calculate price with indirect and utility
  // PriceUnitario = (Material + MO) * (1 + Indirecto) * (1 + Utilidad)
  // But for this adjustment, we'll use the unitCost as the material cost
  // and add MO based on the typical MO rate for equipment installation
  
  for (const item of newItemsToAdd) {
    // Calculate totalAmount: unitCost * quantity
    item.totalAmount = item.unitCost * item.quantity;
    item.total = item.totalAmount;
    item.id = `li_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    item.isEstimated = false;
    
    console.log(`+ ${item.partida}: ${item.code} - ${item.description.substring(0, 40)}...`);
    console.log(`  Qty: ${item.quantity} x $${item.unitCost.toFixed(2)} = $${item.totalAmount.toFixed(2)}`);
    
    items.push(item);
  }

  // Update estimate with new items
  await db.estimate.update({
    where: { id: estimate.id },
    data: {
      lineItems: JSON.stringify(items)
    }
  });

  // Recalculate totals
  let subtotalDirect = 0;
  let subtotalIndirects = 0;
  let subtotalUtility = 0;
  let grandTotal = 0;

  for (const item of items) {
    const total = item.totalAmount || item.total || 0;
    if (total > 0) {
      subtotalDirect += total;
    }
  }

  subtotalIndirects = subtotalDirect * indirectRate;
  subtotalUtility = (subtotalDirect + subtotalIndirects) * utilityRate;
  grandTotal = subtotalDirect + subtotalIndirects + subtotalUtility;

  await db.estimate.update({
    where: { id: estimate.id },
    data: {
      subtotalDirect,
      subtotalIndirects,
      subtotalUtility,
      grandTotal
    }
  });

  console.log('\n=== RESUMEN ===');
  console.log(`Items totales: ${items.length}`);
  console.log(`Subtotal Directo: $${subtotalDirect.toFixed(2)}`);
  console.log(`Indirectos (${(indirectRate * 100).toFixed(0)}%): $${subtotalIndirects.toFixed(2)}`);
  console.log(`Utilidad (${(utilityRate * 100).toFixed(0)}%): $${subtotalUtility.toFixed(2)}`);
  console.log(`GRAN TOTAL: $${grandTotal.toFixed(2)}`);
  console.log(`\n(Antes: $${estimate.grandTotal.toFixed(2)})`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
