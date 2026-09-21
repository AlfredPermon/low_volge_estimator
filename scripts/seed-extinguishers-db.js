const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

console.log('=== Sembrando Precios del Sistema EXTINTOR (SQL Directo) ===');

const projectRoot = path.resolve(__dirname, '..');

const extItems = [
  { sku: 'EXT-PQS-2.5KG', system: 'EXTINTOR', category: 'Equipo', brand: 'Ansul', model: 'PQS-2.5', description: 'Extintor de Polvo Químico Seco (PQS ABC) 2.5 kg', unit: 'pza', unitCost: 800, deviceType: 'fire_extinguisher' },
  { sku: 'EXT-PQS-4.5KG', system: 'EXTINTOR', category: 'Equipo', brand: 'Ansul', model: 'PQS-4.5', description: 'Extintor de Polvo Químico Seco (PQS ABC) 4.5 kg', unit: 'pza', unitCost: 1100, deviceType: 'fire_extinguisher' },
  { sku: 'EXT-PQS-6.0KG', system: 'EXTINTOR', category: 'Equipo', brand: 'Ansul', model: 'PQS-6.0', description: 'Extintor de Polvo Químico Seco (PQS ABC) 6.0 kg', unit: 'pza', unitCost: 1300, deviceType: 'fire_extinguisher' },
  { sku: 'EXT-PQS-10KG', system: 'EXTINTOR', category: 'Equipo', brand: 'Ansul', model: 'PQS-10.0', description: 'Extintor de Polvo Químico Seco (PQS ABC) 10.0 kg', unit: 'pza', unitCost: 1800, deviceType: 'fire_extinguisher' },
  { sku: 'EXT-CO2-2.5KG', system: 'EXTINTOR', category: 'Equipo', brand: 'Ansul', model: 'CO2-2.5', description: 'Extintor de Dióxido de Carbono (CO2) 2.5 kg', unit: 'pza', unitCost: 2450, deviceType: 'fire_extinguisher' },
  { sku: 'EXT-CO2-4.5KG', system: 'EXTINTOR', category: 'Equipo', brand: 'Ansul', model: 'CO2-4.5', description: 'Extintor de Dióxido de Carbono (CO2) 4.5 kg', unit: 'pza', unitCost: 4000, deviceType: 'fire_extinguisher' },
  { sku: 'EXT-CO2-6.0KG', system: 'EXTINTOR', category: 'Equipo', brand: 'Ansul', model: 'CO2-6.0', description: 'Extintor de Dióxido de Carbono (CO2) 6.0 kg', unit: 'pza', unitCost: 5200, deviceType: 'fire_extinguisher' },
  { sku: 'EXT-CO2-10.0KG', system: 'EXTINTOR', category: 'Equipo', brand: 'Ansul', model: 'CO2-10.0', description: 'Extintor de Dióxido de Carbono (CO2) 10.0 kg', unit: 'pza', unitCost: 7500, deviceType: 'fire_extinguisher' },
  { sku: 'EXT-CLEAN-2.5KG', system: 'EXTINTOR', category: 'Equipo', brand: 'Amerex', model: 'HAL-2.5', description: 'Extintor Agente Limpio HFC (Halotrón) 2.5 kg', unit: 'pza', unitCost: 11500, deviceType: 'fire_extinguisher' },
  { sku: 'EXT-CLEAN-4.5KG', system: 'EXTINTOR', category: 'Equipo', brand: 'Amerex', model: 'HAL-4.5', description: 'Extintor Agente Limpio HFC (Halotrón) 4.5 kg', unit: 'pza', unitCost: 13500, deviceType: 'fire_extinguisher' },
  { sku: 'EXT-CLEAN-6.0KG', system: 'EXTINTOR', category: 'Equipo', brand: 'Amerex', model: 'HAL-6.0', description: 'Extintor Agente Limpio HFC (Halotrón) 6.0 kg', unit: 'pza', unitCost: 16500, deviceType: 'fire_extinguisher' },
  { sku: 'EXT-CLEAN-10.0KG', system: 'EXTINTOR', category: 'Equipo', brand: 'Amerex', model: 'HAL-10.0', description: 'Extintor Agente Limpio HFC (Halotrón) 10.0 kg', unit: 'pza', unitCost: 19500, deviceType: 'fire_extinguisher' },
  { sku: 'EXT-CLASEA-6.0KG', system: 'EXTINTOR', category: 'Equipo', brand: 'Amerex', model: 'H2O-6.0', description: 'Extintor de Agua a Presión — Clase A 6kg', unit: 'pza', unitCost: 1600, deviceType: 'fire_extinguisher' },
  { sku: 'EXT-CLASEA-10.0KG', system: 'EXTINTOR', category: 'Equipo', brand: 'Amerex', model: 'H2O-10.0', description: 'Extintor de Agua a Presión — Clase A 10kg', unit: 'pza', unitCost: 2000, deviceType: 'fire_extinguisher' },
  { sku: 'EXT-AFFF-4.5KG', system: 'EXTINTOR', category: 'Equipo', brand: 'Amerex', model: 'AFFF-4.5', description: 'Extintor de espuma AFFF Espuma clase A, B 4.5kg', unit: 'pza', unitCost: 2000, deviceType: 'fire_extinguisher' },
  { sku: 'EXT-AFFF-6.0KG', system: 'EXTINTOR', category: 'Equipo', brand: 'Amerex', model: 'AFFF-6.0', description: 'Extintor de espuma AFFF Espuma clase A, B 6.0kg', unit: 'pza', unitCost: 2500, deviceType: 'fire_extinguisher' },
  { sku: 'EXT-AFFF-10.0KG', system: 'EXTINTOR', category: 'Equipo', brand: 'Amerex', model: 'AFFF-10.0', description: 'Extintor de espuma AFFF Espuma clase A, B 10.0kg', unit: 'pza', unitCost: 3500, deviceType: 'fire_extinguisher' },
  { sku: 'EXT-CLASSK-6L', system: 'EXTINTOR', category: 'Equipo', brand: 'Amerex', model: 'K-6.0L', description: 'Extintor Clase K Acetato de Potasio 6.0 Litros', unit: 'pza', unitCost: 4600, deviceType: 'fire_extinguisher' },
  { sku: 'EXT-CLASSK-10L', system: 'EXTINTOR', category: 'Equipo', brand: 'Amerex', model: 'K-10.0L', description: 'Extintor Clase K Acetato de Potasio 10.0 Litros', unit: 'pza', unitCost: 7000, deviceType: 'fire_extinguisher' },
];

async function seedDatabase(dbPath) {
  if (!fs.existsSync(dbPath)) {
    console.log(`Base de datos no encontrada: ${dbPath}`);
    return;
  }

  console.log(`\nSincronizando sistema EXTINTOR en: ${dbPath}`);
  const db = new PrismaClient({
    datasourceUrl: `file:${path.resolve(dbPath)}`,
  });

  try {
    let count = 0;
    for (const item of extItems) {
      const skuEscaped = item.sku.replace(/'/g, "''");
      const descEscaped = item.description.replace(/'/g, "''");
      const brandEscaped = item.brand.replace(/'/g, "''");
      const modelEscaped = item.model.replace(/'/g, "''");
      const system = item.system;
      const category = item.category;
      const unit = item.unit;
      const unitCost = item.unitCost;
      const deviceType = item.deviceType;

      const existing = await db.$queryRawUnsafe(
        `SELECT id FROM PriceItem WHERE sku = '${skuEscaped}' LIMIT 1;`
      );

      if (Array.isArray(existing) && existing.length > 0) {
        const id = existing[0].id;
        await db.$executeRawUnsafe(
          `UPDATE PriceItem SET unitCost = ${unitCost}, brand = '${brandEscaped}', model = '${modelEscaped}', description = '${descEscaped}', system = '${system}', category = '${category}', unit = '${unit}', active = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = '${id}';`
        );
      } else {
        const newId = `c_ext_${Math.random().toString(36).substring(2, 9)}`;
        await db.$executeRawUnsafe(
          `INSERT INTO PriceItem (id, sku, system, category, brand, model, description, unit, unitCost, performance, deviceType, active, createdAt, updatedAt) VALUES ('${newId}', '${skuEscaped}', '${system}', '${category}', '${brandEscaped}', '${modelEscaped}', '${descEscaped}', '${unit}', ${unitCost}, 0, '${deviceType}', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`
        );
      }
      count++;
    }
    console.log(`✓ ${count} extintores del sistema EXTINTOR sembrados exitosamente en ${path.basename(dbPath)}.`);
  } catch (err) {
    console.error(`Error en ${dbPath}:`, err);
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  const customDb = path.join(projectRoot, 'db', 'custom.db');
  const stagingDb = path.join(projectRoot, 'db', 'staging.db');
  
  await seedDatabase(customDb);
  await seedDatabase(stagingDb);
  
  console.log('\n=== Proceso de sembrado EXTINTOR completado ===');
}

main().catch(console.error);
