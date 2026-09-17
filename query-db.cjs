const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  console.log('=== All PriceItems with brand/model ===');
  const allItems = await db.priceItem.findMany({
    where: {
      brand: { not: '' }
    },
    orderBy: { sku: 'asc' }
  });
  console.log(JSON.stringify(allItems.map(p => ({ sku: p.sku, brand: p.brand, model: p.model, description: p.description, unitCost: p.unitCost })), null, 2));

  console.log('\n=== Sample line items from estimates ===');
  const estimates = await db.estimate.findMany({ take: 1 });
  if (estimates.length > 0) {
    const items = JSON.parse(estimates[0].lineItems || '[]');
    const cctvItems = items.filter(i => i.system === 'CCTV').slice(0, 15);
    console.log(JSON.stringify(cctvItems.map(i => ({ code: i.code, partida: i.partida, description: i.description, marca: i.marca, modelo: i.modelo })), null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
