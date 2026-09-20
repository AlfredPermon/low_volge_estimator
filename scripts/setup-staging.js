const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('=== Configurando Entorno de Pruebas (Staging) ===');

const projectRoot = path.resolve(__dirname, '..');
const dbDir = path.join(projectRoot, 'db');
const customDb = path.join(dbDir, 'custom.db');
const stagingDb = path.join(dbDir, 'staging.db');
const envStagingFile = path.join(projectRoot, '.env.staging');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 1. Crear staging.db si no existe (copiando custom.db o creando uno nuevo)
if (!fs.existsSync(stagingDb)) {
  if (fs.existsSync(customDb)) {
    fs.copyFileSync(customDb, stagingDb);
    console.log('✓ Copiado db/custom.db -> db/staging.db como base inicial');
  } else {
    fs.writeFileSync(stagingDb, '');
    console.log('✓ Creado db/staging.db vacío');
  }
} else {
  console.log('✓ db/staging.db ya existe');
}

// 2. Crear .env.staging
const envContent = `DATABASE_URL="file:${stagingDb.replace(/\\/g, '/')}"\nPORT=3001\n`;
fs.writeFileSync(envStagingFile, envContent);
console.log('✓ Archivo .env.staging creado exitosamente');

console.log('\nEntorno de pruebas configurado correctamente.');
console.log('Para iniciar en modo staging:');
console.log('  npm run dev:staging');
