FROM node:22-bookworm-slim AS base
# Instalar OpenSSL requerido por el motor de Prisma en todas las fases
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Fase 1: Instalar dependencias
FROM base AS deps
WORKDIR /app

# Copiar archivos de manifiesto
COPY package.json package-lock.json ./

# Limpiar caché y usar install (con flags para evitar cuelgues por dependencias)
RUN npm cache clean --force && npm install --legacy-peer-deps --no-audit --no-fund

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

# Compilar Next.js pasando las variables temporales de compilación en línea
# (evita exponer secretos ficticios en las directivas ENV e instruir falsas alarmas en Docker Build checks)
RUN BETTER_AUTH_SECRET="a9b8c7d6e5f4g3h2i1j0k9l8m7n6o5p4q3r2s1t0u9v8w7x6y5z4A3B2C1D0E9F8" \
    BETTER_AUTH_URL="http://localhost:3000" \
    npm run build

# Fase 3: Imagen de producción
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

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
