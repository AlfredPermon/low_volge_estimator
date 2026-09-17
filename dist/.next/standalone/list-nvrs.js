const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.priceItem.findMany({
    where: {
      deviceType: 'cctv_nvr'
    }
  });

  console.log("NVR items found:", items.length);
  for (const item of items) {
    console.log(`SKU: ${item.sku}, Model: ${item.model}, Brand: ${item.brand}, Desc: ${item.description.substring(0, 30)}`);
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
