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
  
  console.log('=== ANALISIS COMPARATIVO ===\n');
  
  // Compare key items with proposal
  const comparisons = [
    { code: 'CCTV-NVR-001', name: 'NVR VIVOTEK NR9682-v3', prop_qty: 1, prop_price: 174024.00 },
    { code: 'CCTV-DISK-001', name: 'Disco Duro 10TB', prop_qty: 12, prop_price: 8888.80 },
    { code: 'CCTV-CAB-001', name: 'Cable UTP Cat6', prop_qty: 3660, prop_price: 49.59 }, // 12 bobinas x 305m
    { code: 'CCTV-SWITCH-048', name: 'Switch 48 Puertos PoE', prop_qty: 1, prop_price: 28250.00 },
    { code: 'CCTV-SWITCH-024', name: 'Switch 24 Puertos PoE', prop_qty: 1, prop_price: 18937.50 },
    { code: 'CCTV-DISPLAY-055', name: 'Display Samsung 55"', prop_qty: 1, prop_price: 19514.40 },
    { code: 'CCTV-UPS-2000', name: 'UPS 2000VA', prop_qty: 1, prop_price: 15895.50 },
  ];

  console.log('=== Comparación de Precios Unitarios ===');
  console.log('Item | Propuesta | Presupuesto | Diferencia');
  console.log('-----|-----------|-------------|------------');

  for (const comp of comparisons) {
    const budgetItem = items.find(i => i.code === comp.code);
    if (budgetItem) {
      const diff = budgetItem.unitCost - comp.prop_price;
      const pct = ((diff / comp.prop_price) * 100).toFixed(1);
      console.log(`${comp.name.substring(0, 20)} | $${comp.prop_price.toFixed(2)} | $${budgetItem.unitCost.toFixed(2)} | ${diff >= 0 ? '+' : ''}${diff.toFixed(2)} (${pct}%)`);
    } else if (comp.code.startsWith('CCTV-SWITCH') || comp.code === 'CCTV-DISPLAY-055' || comp.code === 'CCTV-UPS-2000') {
      console.log(`${comp.name.substring(0, 20)} | $${comp.prop_price.toFixed(2)} | FALTA | AGREGADO AHORA`);
    }
  }

  // Analyze what the budget SHOULD be based on proposal + IVA
  console.log('\n=== Análisis de Totales ===');
  
  // Proposal totals
  const prop_subtotal = 1200956.08;
  const prop_iva = 192152.97;
  const prop_total = 1393109.05;
  
  // Budget totals
  const budget_total = estimate.grandTotal;
  const budget_items = items.filter(i => (i.totalAmount || i.total || 0) > 0);
  const budget_direct = budget_items.reduce((sum, i) => sum + (i.totalAmount || i.total || 0), 0);
  
  console.log('Propuesta:');
  console.log(`  Subtotal: $${prop_subtotal.toFixed(2)}`);
  console.log(`  IVA: $${prop_iva.toFixed(2)}`);
  console.log(`  TOTAL: $${prop_total.toFixed(2)}`);
  
  console.log('\nPresupuesto Actual:');
  console.log(`  Items activos: ${budget_items.length}`);
  console.log(`  Subtotal Directo: $${budget_direct.toFixed(2)}`);
  console.log(`  GRAN TOTAL (c/indirectos y utilidad): $${budget_total.toFixed(2)}`);
  
  // Difference analysis
  const diff = budget_total - prop_total;
  console.log(`\nDiferencia: $${diff.toFixed(2)} (${((diff/prop_total)*100).toFixed(1)}%)`);
  
  // If we adjust prices to match proposal
  console.log('\n=== Para igualar la propuesta de $1,393,109.05 ===');
  console.log('El presupuesto actual tiene precios unitarios MÁS ALTOS que la propuesta.');
  console.log('Por ejemplo:');
  console.log('  - NVR: propuesta $174,024 vs presupuesto $221,909 (27.5% más caro)');
  console.log('  - Discos: propuesta $106,666 vs presupuesto $147,917 (38.6% más caro)');
  console.log('\nRecomendación: Ajustar precios unitarios a los de la propuesta.');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
