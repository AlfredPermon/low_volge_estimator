import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl && tursoAuthToken) {
    const adapter = new PrismaLibSQL({
      url: tursoUrl,
      authToken: tursoAuthToken,
    });

    return new PrismaClient({
      adapter,
      log: ['error', 'warn'],
    });
  }

  return new PrismaClient({
    log: ['error', 'warn'],
  });
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

globalForPrisma.prisma = prisma;

export default prisma;
