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
  
  // Show one item structure to understand the format
  console.log('=== Estructura de un item ===');
  if (items.length > 0) {
    console.log(JSON.stringify(items[0], null, 2));
  }

  // Show the CCTV section partida numbers
  const cctvItems = items.filter(i => i.system === 'CCTV');
  console.log('\n=== Última partida CCTV ===');
  const maxPartida = Math.max(...cctvItems.map(i => parseInt(i.partida.split('.')[2])));
  console.log('Max partida:', maxPartida);

  // Get the price items we just added
  console.log('\n=== Nuevos items disponibles ===');
  const newSkus = ['CCTV-SWITCH-048', 'CCTV-SWITCH-024', 'CCTV-DISPLAY-055', 'CCTV-UPS-2000', 
                   'CCTV-PATCH-048', 'CCTV-RACK-2P', 'CCTV-ORG-VERT', 'CCTV-ORG-HORZ', 'CCTV-PDU-12'];
  const priceItems = await db.priceItem.findMany({
    where: { sku: { in: newSkus } }
  });
  priceItems.forEach(p => {
    console.log(`${p.sku}: ${p.brand} ${p.model} - $${p.unitCost}`);
  });
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
