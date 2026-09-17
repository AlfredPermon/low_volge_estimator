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
  console.log('=== Estimate Info ===');
  console.log('Name:', estimate.name);
  console.log('Grand Total:', estimate.grandTotal);
  console.log('Total items:', items.length);

  console.log('\n=== CCTV Items (first 30) ===');
  const cctvItems = items.filter(i => i.system === 'CCTV');
  console.log('CCTV items count:', cctvItems.length);
  cctvItems.slice(0, 30).forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.partida} | ${item.code} | ${item.description} | Qty: ${item.quantity} | Total: ${item.totalAmount || item.total}`);
  });

  console.log('\n=== All items grouped by system ===');
  const bySystem = {};
  items.forEach(item => {
    const sys = item.system || 'UNKNOWN';
    if (!bySystem[sys]) bySystem[sys] = { count: 0, total: 0 };
    bySystem[sys].count++;
    bySystem[sys].total += (item.totalAmount || item.total || 0);
  });
  Object.entries(bySystem).forEach(([sys, data]) => {
    console.log(`${sys}: ${data.count} items, Total: $${data.total.toFixed(2)}`);
  });
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
