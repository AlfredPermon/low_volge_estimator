FROM node:20-alpine AS base

# Fase 1: Instalar dependencias
FROM base AS deps
# libc6-compat y openssl son necesarios para Prisma y binarios en Alpine
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copiar archivos de manifiesto
COPY package.json package-lock.json ./
# Instalar todas las dependencias
RUN npm ci

# Fase 2: Construir la aplicación
FROM base AS builder
WORKDIR /app
# Traer las dependencias instaladas
COPY --from=deps /app/node_modules ./node_modules
# Copiar el código fuente
COPY . .

# Generar el cliente de Prisma
RUN npx prisma generate

# Desactivar telemetría de Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Compilar Next.js (requiere output: 'standalone' en next.config.ts)
RUN npm run build

# Fase 3: Imagen de producción
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Necesario para que Prisma funcione en Alpine
RUN apk add --no-cache openssl

# Copiar archivos estáticos y carpeta prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Aprovechar el output standalone de Next.js
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Exponer el puerto
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Iniciar servidor Node
CMD ["node", "server.js"]
