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
  
  // Show all partida numbers for CCTV
  const cctvItems = items.filter(i => i.system === 'CCTV');
  console.log('=== Partidas CCTV ===');
  cctvItems.forEach(item => {
    console.log(`${item.partida}: ${item.description?.substring(0, 50)}`);
  });

  // Parse partida numbers correctly
  const partidaNums = cctvItems.map(i => {
    const parts = i.partida.split('.');
    return parseInt(parts[2] || '0');
  });
  const maxPartidaNum = Math.max(...partidaNums);
  console.log('\nMax partida number:', maxPartidaNum);

  // Find the last partida
  const lastCCTVItem = cctvItems.reduce((max, item) => {
    const maxNum = parseInt(max.partida.split('.')[2] || '0');
    const itemNum = parseInt(item.partida.split('.')[2] || '0');
    return itemNum > maxNum ? item : max;
  }, cctvItems[0]);
  
  console.log('\nLast CCTV item:', lastCCTVItem.partida);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
