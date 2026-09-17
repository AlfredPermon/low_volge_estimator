const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const estimate = await db.estimate.findFirst({
    where: { name: { contains: 'UPAEP' } }
  });

  if (!estimate) {
    console.log('No se encontro UPAEP');
    return;
  }

  const items = JSON.parse(estimate.lineItems || '[]');
  
  console.log('=== PRESUPUESTO ACTUAL ===');
  console.log('Name:', estimate.name);
  console.log('Grand Total:', estimate.grandTotal);
  console.log('');
  
  // Group by system
  const bySystem = {};
  items.forEach(item => {
    const sys = item.system || 'UNKNOWN';
    if (!bySystem[sys]) bySystem[sys] = { items: [], total: 0 };
    bySystem[sys].items.push(item);
    bySystem[sys].total += (item.totalAmount || item.total || 0);
  });

  for (const [sys, data] of Object.entries(bySystem)) {
    console.log(`\n=== ${sys} (Total: $${data.total.toFixed(2)}) ===`);
    data.items.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.partida} | ${item.code} | ${item.description?.substring(0, 60)}... | Qty: ${item.quantity} | Total: $${(item.totalAmount || item.total || 0).toFixed(2)}`);
    });
  }

  // Check for missing items
  console.log('\n\n=== COMPARATIVA ===');
  console.log('Propuesta tiene pero Presupuesto NO tiene:');
  console.log('1. UniFi Switch USW-Pro-48-POE Gen2 (48 puertos PoE)');
  console.log('2. UniFi Switch USW-Pro-24-POE Gen2 (24 puertos PoE)');
  console.log('3. Samsung Display 55" (QBC o similar)');
  console.log('4. UPS 2000VA On-Line');
  console.log('5. Patch Panels adicionales');
  console.log('6. Más cable UTP (la propuesta tiene 12 bobinas = 3660m vs presupuesto)');
  console.log('7. Organizadores Verticales');
  console.log('8. Velcro, etiquetas, certificaciones');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
