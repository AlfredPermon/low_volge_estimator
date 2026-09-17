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

  console.log('=== RECUPERANDO PRESUPUESTO BASE Y AGREGANDO COMPONENTES ===\n');
  
  // Restore original prices from the proposal reference
  // The proposal has lower prices for some items
  // But we want to keep the current methodology
  
  let items = JSON.parse(estimate.lineItems || '[]');
  
  // The key insight: user expects $2,084,877.67 as base (without IVA)
  // Then with IVA: $2,418,458.10
  // Current items without new components: 
  // - NVR: was $221,909.12 (should be adjusted if needed)
  // - Disks: was $147,916.96
  
  // Let's check what the original items total
  const originalItems = items.filter(i => 
    !['CCTV-SWITCH-048', 'CCTV-SWITCH-024', 'CCTV-DISPLAY-055', 
      'CCTV-UPS-2000', 'CCTV-PATCH-048', 'CCTV-RACK-2P', 
      'CCTV-ORG-VERT', 'CCTV-ORG-HORZ', 'CCTV-PDU-12'].includes(i.code)
  );
  
  const newItems = items.filter(i => 
    ['CCTV-SWITCH-048', 'CCTV-SWITCH-024', 'CCTV-DISPLAY-055', 
      'CCTV-UPS-2000', 'CCTV-PATCH-048', 'CCTV-RACK-2P', 
      'CCTV-ORG-VERT', 'CCTV-ORG-HORZ', 'CCTV-PDU-12'].includes(i.code)
  );
  
  const originalTotal = originalItems.reduce((sum, i) => sum + (i.totalAmount || i.total || 0), 0);
  const newItemsTotal = newItems.reduce((sum, i) => sum + (i.totalAmount || i.total || 0), 0);
  
  console.log('Original items total:', originalTotal.toFixed(2));
  console.log('New items total:', newItemsTotal.toFixed(2));
  console.log('Combined:', (originalTotal + newItemsTotal).toFixed(2));
  
  // User expects $2,084,877.67 base (before my changes)
  // Let's restore NVR and disk prices to original
  // NVR: $221,909.12 (original)
  // Disk: $147,916.96 (original, 16 disks)
  
  const nvrItem = items.find(i => i.code === 'CCTV-NVR-001');
  const diskItem = items.find(i => i.code === 'CCTV-DISK-001');
  
  if (nvrItem) {
    nvrItem.unitCost = 221909.12;
    nvrItem.totalAmount = nvrItem.unitCost * nvrItem.quantity;
    nvrItem.total = nvrItem.totalAmount;
    console.log(`\nNVR restored to: $${nvrItem.totalAmount.toFixed(2)}`);
  }
  
  if (diskItem) {
    diskItem.unitCost = 9244.81;
    diskItem.totalAmount = diskItem.unitCost * diskItem.quantity;
    diskItem.total = diskItem.totalAmount;
    console.log(`Disks restored to: $${diskItem.totalAmount.toFixed(2)}`);
  }
  
  // Recalculate totals
  const indirectRate = estimate.indirectFactor || 0.12;
  const utilityRate = estimate.utilityFactor || 0.15;
  
  let subtotalDirect = 0;
  for (const item of items) {
    const total = item.totalAmount || item.total || 0;
    if (total > 0) {
      subtotalDirect += total;
    }
  }

  const subtotalIndirects = subtotalDirect * indirectRate;
  const subtotalUtility = (subtotalDirect + subtotalIndirects) * utilityRate;
  const grandTotal = subtotalDirect + subtotalIndirects + subtotalUtility;
  const withIva = grandTotal * 1.16;

  // Update estimate
  await db.estimate.update({
    where: { id: estimate.id },
    data: {
      lineItems: JSON.stringify(items),
      subtotalDirect,
      subtotalIndirects,
      subtotalUtility,
      grandTotal
    }
  });

  console.log('\n=== RESULTADO ACTUALIZADO ===');
  console.log(`Subtotal Directo: $${subtotalDirect.toFixed(2)}`);
  console.log(`Indirectos (12%): $${subtotalIndirects.toFixed(2)}`);
  console.log(`Utilidad (15%): $${subtotalUtility.toFixed(2)}`);
  console.log(`GRAN TOTAL (sin IVA): $${grandTotal.toFixed(2)}`);
  console.log(`CON IVA (16%): $${withIva.toFixed(2)}`);
  
  console.log('\n=== COMPARACIÓN ===');
  console.log(`Usuario espera sin IVA: $2,084,877.67`);
  console.log(`Diferencia: $${(grandTotal - 2084877.67).toFixed(2)}`);
  console.log(`\nUsuario espera con IVA: $2,418,458.10`);
  console.log(`Diferencia: $${(withIva - 2418458.10).toFixed(2)}`);
  
  console.log('\n=== COMPONENTES AGREGADOS ===');
  newItems.forEach(item => {
    console.log(`+ ${item.partida}: ${item.description.substring(0, 50)}... = $${(item.totalAmount || 0).toFixed(2)}`);
  });
  console.log(`\nTotal nuevos componentes: $${newItemsTotal.toFixed(2)}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
