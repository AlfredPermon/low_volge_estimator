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
  
  console.log('=== AJUSTANDO PRECIOS UNITARIOS ===\n');
  
  // Adjust unit costs to match proposal prices
  // The proposal has these prices (without indirects/utility in the unit price)
  const priceAdjustments = [
    { code: 'CCTV-NVR-001', newPrice: 174024.00, reason: 'NVR VIVOTEK según propuesta' },
    { code: 'CCTV-DISK-001', newPrice: 8888.80, reason: 'Disco WD 10TB según propuesta' },
  ];

  for (const adj of priceAdjustments) {
    const item = items.find(i => i.code === adj.code);
    if (item) {
      const oldTotal = item.totalAmount || item.total || 0;
      item.unitCost = adj.newPrice;
      item.totalAmount = adj.newPrice * item.quantity;
      item.total = item.totalAmount;
      console.log(`${adj.code}: $${oldTotal.toFixed(2)} -> $${item.totalAmount.toFixed(2)} [${adj.reason}]`);
    }
  }

  // Update items in database
  await db.estimate.update({
    where: { id: estimate.id },
    data: {
      lineItems: JSON.stringify(items)
    }
  });

  // Recalculate totals with indirects and utility
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

  await db.estimate.update({
    where: { id: estimate.id },
    data: {
      subtotalDirect,
      subtotalIndirects,
      subtotalUtility,
      grandTotal
    }
  });

  console.log('\n=== RESUMEN ACTUALIZADO ===');
  console.log(`Subtotal Directo: $${subtotalDirect.toFixed(2)}`);
  console.log(`Indirectos (${(indirectRate * 100).toFixed(0)}%): $${subtotalIndirects.toFixed(2)}`);
  console.log(`Utilidad (${(utilityRate * 100).toFixed(0)}%): $${subtotalUtility.toFixed(2)}`);
  console.log(`GRAN TOTAL: $${grandTotal.toFixed(2)}`);
  console.log(`\nPropuesta TOTAL: $1,393,109.05`);
  console.log(`Diferencia: $${(grandTotal - 1393109.05).toFixed(2)}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
