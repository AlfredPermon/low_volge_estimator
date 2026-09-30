import { db, ensureDatabaseSchema } from './src/lib/db';

async function main() {
  console.log('Ensuring DB schema...');
  await ensureDatabaseSchema();
  console.log('Done ensuring schema.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
