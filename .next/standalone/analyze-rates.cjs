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

  console.log('=== CONFIGURACIÓN DEL PROYECTO ===');
  console.log(`Nombre: ${estimate.name}`);
  console.log(`Indirecto: ${(estimate.indirectFactor * 100).toFixed(0)}%`);
  console.log(`Utilidad: ${(estimate.utilityFactor * 100).toFixed(0)}%`);
  console.log(`IVA: ${(estimate.ivaRate * 100).toFixed(0)}%`);
  
  // Calculate what the proposal's effective rates might be
  const prop_directo = 1200956.08;
  const prop_iva = 192152.97;
  const prop_total = 1393109.05;
  
  console.log('\n=== ANÁLISIS DE TASAS DE LA PROPUESTA ===');
  console.log(`Propuesta Subtotal (costo directo): $${prop_directo.toFixed(2)}`);
  console.log(`Propuesta IVA (16%): $${prop_iva.toFixed(2)}`);
  console.log(`Propuesta Total: $${prop_total.toFixed(2)}`);
  
  // Calculate what the proposal implies for indirects + utility
  // The proposal shows individual prices, but they might already include i+u
  // Let's see: if total = directo * (1+indirect) * (1+util) * (1+iva)
  // Then: directo*(1+i)*(1+u) = subtotal_conceptos
  // But we don't know what the concepts subtotal is...

  // Alternative: Maybe the proposal prices already INCLUDE indirects and utility
  // So we can reverse-engineer:
  // total = directo * (1+i+u combined)
  // Where i+u combined = prop_total / prop_directo / (1+iva)
  
  const implied_rate = (prop_total / (1 + 0.16)) / prop_directo;
  console.log(`\nTasa implícita (indirectos+utilidad): ${((implied_rate - 1) * 100).toFixed(1)}%`);
  
  // Now let's understand what rates would match the user's expected $2,418,458.10
  console.log('\n=== CÁLCULOS INVERSOS ===');
  console.log(`Usuario espera: $2,418,458.10`);
  
  // If we assume 16% IVA:
  const sin_iva_target = 2418458.10 / 1.16;
  console.log(`Sin IVA: $${sin_iva_target.toFixed(2)}`);
  
  // If we assume 12% indirect + 15% util:
  const target_direct = sin_iva_target / 1.12 / 1.15;
  console.log(`Costo directo objetivo (12% ind, 15% util): $${target_direct.toFixed(2)}`);
  
  // Current budget subtotal directo
  const items = JSON.parse(estimate.lineItems || '[]');
  const current_direct = items.reduce((sum, i) => sum + (i.totalAmount || i.total || 0), 0);
  console.log(`Costo directo actual: $${current_direct.toFixed(2)}`);
  console.log(`Diferencia en directo: $${(current_direct - target_direct).toFixed(2)}`);
  
  // Options to reach target
  console.log('\n=== OPCIONES PARA ALCANZAR $2,418,458.10 ===');
  console.log('1. Reducir costo directo a $', sin_iva_target.toFixed(2));
  console.log('2. O agregar componentes por $', (sin_iva_target - current_direct).toFixed(2));
  console.log('3. O cambiar factores (indirectos/utilidad)');
  
  // Check if maybe the system has different MO rates
  console.log(`\nTasas de MO configuradas:`);
  console.log(`  Técnico: $${estimate.laborTechnicianRate}`);
  console.log(`  Oficial: $${estimate.laborOfficerRate}`);
  console.log(`  Ayudante: $${estimate.laborHelperRate}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
