# Plan de Remediación de Vulnerabilidades — LowVoltageEstimator

> Basado en el diagnóstico de auditoría (Next.js + Prisma + API Routes).
> Principio rector: **defensa en profundidad** — cada endpoint valida sesión, rol y propiedad del recurso; los secretos nunca viven en el código; las dependencias se mantienen parcheadas.

---

## 0. Priorización general (matriz riesgo × esfuerzo)

| # | Vulnerabilidad | Severidad | Riesgo real | Esfuerzo fix | Prioridad | Fase |
|---|----------------|-----------|-------------|--------------|-----------|------|------|
| V1 | `/api/auth/seed-admin` sin autenticación (crea admins) | CRÍTICA | Explotación remota trivial → toma total de control | Bajo | P0 | 1 |
| V2 | Secreto JWT hardcodeado / fallback débil | CRÍTICA | Suplantación de cualquier usuario (incl. admin) | Bajo | P0 | 1 |
| V3 | IDOR: rutas `estimates`, `users`, `schedule`, `prices` sin chequear propiedad/rol | ALTA–CRÍTICA | Lectura/escritura cruzada de datos de otros usuarios | Medio | P0/P1 | 1–2 |
| V4 | SSRF en notificaciones (URL proporcionada por el usuario → fetch server-side) | ALTA | Acceso a red interna / metadatos cloud (IMDS) | Medio | P1 | 2 |
| V5 | Hashing de contraseñas débil (SHA-256 sin salt / bcrypt rounds bajos) | ALTA | Cracking offline masivo ante filtración de DB | Medio (requiere migración) | P1 | 2 |
| V6 | Dependencias con CVEs (Next.js, xlsx SheetJS) | ALTA | RCE / prototypal pollution / bypass auth según CVE | Bajo–Medio | P1 | 2 |
| V7 | Endpoints destructivos sin guarda (`/api/prices/clear`, `seed-defaults`) | ALTA | Borrado de datos por cualquier usuario anónimo | Bajo | P0 | 1 |
| V8 | Uploads sin validación (tipo/tamaño/ruta) en `schedule/engineering/upload` | MEDIA | Path traversal, DoS, servir archivos maliciosos | Medio | P2 | 3 |
| V9 | Falta de rate limiting / cabeceras de seguridad (CSP, HSTS, X-Frame…) | MEDIA | Brute force, clickjacking, XSS reflejado | Bajo | P2 | 3 |
| V10 | Información sensible en logs / respuestas de error (stack traces) | BAJA–MEDIA | Facilita reconocimiento | Bajo | P3 | 3 |

---

## FASE 1 — P0: Cierre de exposición crítica inmediata (día 1)

### Tarea 1.1 — Neutralizar `seed-admin` (V1)
**Análisis del fallo:** el endpoint permite crear un usuario con rol `admin` sin ninguna sesión previa. En producción esto es una puerta trasera autoinfligida: cualquier anónimo puede invocar `POST /api/auth/seed-admin` y obtener privilegios totales.

**Corrección (opción elegida: eliminar + gating por entorno):**
1. Eliminar el route handler de la superficie pública (`src/app/api/auth/seed-admin/route.ts`).
2. Mover la creación del primer admin a un **script de bootstrap CLI** (`scripts/bootstrap-admin.ts`) ejecutado solo por ops, fuera del ciclo request/response.
3. Si debe existir un seed automático, ejecutarlo únicamente en `next start` cuando:
   - `process.env.NODE_ENV !== 'production'`, o
   - `process.env.SEED_BOOTSTRAP_KEY` coincide con una clave de un solo uso definida por env y consumida tras el primer éxito.
4. Añadir test que afirme: `fetch('/api/auth/seed-admin')` devuelve 404/403 en producción.

**Criterio de aceptación:** no existe ningún HTTP path público que pueda crear roles elevados sin sesión admin válida.

### Tarea 1.2 — Gestión segura del secreto JWT (V2)
**Análisis:** patrón detectado `const SECRET = process.env.JWT_SECRET || 'hardcoded-dev-secret'`. El fallback hace que, si el deploy olvida la variable, el sistema corra con un secreto conocido públicamente → forja de tokens ilimitada.

**Corrección:**
1. Crear `src/lib/auth-config.ts`:
   - Leer `JWT_SECRET`; si falta o tiene < 32 bytes → **lanzar error en el arranque** (fail-fast, nunca fallback silencioso).
   - Validar entropía mínima (longitud ≥ 32, rechazo de valores obvios tipo `secret`, `changeme`).
2. Rotación obligatoria: generar secreto nuevo (`openssl rand -base64 48`), invalidando sesiones existentes. Documentar el procedimiento de rotación.
3. Migrar a `jose` (HS256→ preferir verificación explícita de `alg`, `exp`, `iss`, `aud`) para evitar ataques de algoritmo-confusion (`alg:none`).
4. Cookies de sesión: `httpOnly`, `secure`, `sameSite='lax'|'strict'`, `path='/'` acotado; TTL corto (≤ 8h) + refresh o TTL máximo de 24h.
5. Scrub del repo: buscar el secreto hardcodeado en git history (`git grep`, trufflehog) y documentar su expiración/rotación como comprometido.

**Criterio de aceptación:** `grep -R "hardcoded\|dev-secret\|jwt_secret" src/` = 0 resultados; la app no arranca sin `JWT_SECRET` fuerte.

### Tarea 1.3 — Autorización centralizada anti-IDOR (V3, V7)
**Análisis:** los handlers actuales hacen `prisma.*.findUnique({ where: { id } })` con el `id` de la URL sin comprobar que el recurso pertenezca al usuario autenticado ni que el rol lo autorice. Es el clásico IDOR horizontal (ver/editar estimaciones ajenas) y vertical (usuario normal accediendo a `/api/users`, `/api/prices/clear`).

**Corrección:**
1. Crear `src/lib/authz.ts` con dos primitivas:
   ```ts
   requireSession(req): Session            // 401 si no hay cookie/token válido
   requireRole(session, ...roles): void    // 403 si rol insuficiente
   ```
2. Crear `assertOwnership(session, resourceOwnerId)` para recursos de usuario (estimates, uploads, historiales).
3. Aplicar **por diseño** en todas las rutas:
   - `/api/estimates*` → `requireSession` + ownership en GET/PATCH/DELETE por `[id]`.
   - `/api/users*` → `requireRole('admin')` en GET lista, POST, PATCH, DELETE; un usuario solo puede leer/editar su propio perfil.
   - `/api/prices/clear`, `/seed-defaults`, import/export masivo → `requireRole('admin')`.
   - `/api/schedule/*` → mínimo `requireSession`; mutaciones restringidas a roles gestor/admin.
4. Regla anti-regresión: middleware/lint rule (ESLint custom o check en CI) que exija que todo archivo bajo `src/app/api/**/route.ts` importe `requireSession` o esté en una allowlist explícita de rutas públicas (solo `login`, `logout`, healthcheck).

**Criterio de aceptación:** matriz de tests (usuario A vs recurso de B; rol user vs endpoint admin) pasa; cualquier ruta nueva sin auth falla el lint de CI.

---

## FASE 2 — P1: Correcciones estructurales (semana 1)

### Tarea 2.1 — Mitigar SSRF en notificaciones (V4)
**Análisis:** el módulo de notificaciones hace `fetch(url)` con una URL configurable por el usuario (webhooks). Un atacante puede apuntar a `http://169.254.169.254/`, `http://localhost:PORT/api`, redes internas o `file:` según stack.

**Corrección:**
1. Allowlist de esquemas: solo `https:` (y `http:` si se documenta excepciones).
2. Resolver DNS **antes** del fetch y rechazar direcciones privadas/enlaces locales:
   - Bloquear rangos: `10/8`, `172.16/12`, `192.168/16`, `127/8`, `169.254/16`, `::1`, `fc00::/7`, y el metadata endpoint cloud.
   - Prevenir TOCTOU/DNS-rebinding: usar agente HTTP que revalide la IP resuelta en la conexión (ej. `undici` con interceptor o librería dedicada tipo `ssrf-req-filter`).
3. Prohibir redirects automáticos (`redirect: 'manual'`) y repetir la validación en cada Location.
4. Timeout estricto (≤ 5 s) y límite de tamaño de respuesta.
5. Logs de intentos bloqueados para detección de abuso.

**Criterio de aceptación:** suite de tests SSRF (localhost, RFC1918, link-local, decimal/hex-encoded IPs, redirect-to-internal) todos devuelven 400/bloqueo.

### Tarea 2.2 — Migración de hashing de contraseñas (V5)
**Análisis:** SHA-256 sin salt (o bcrypt con rounds bajos) permite cracking paralelo/GPU masivo. La corrección no puede romper logins existentes → requiere migración progresiva.

**Corrección:**
1. Adoptar `argon2id` (params: memory 64 MiB, iterations 3, parallelism 4) o `bcrypt` cost ≥ 12 vía `@node-rs/argon2` o `bcryptjs` nativo.
2. Migración dual-write lazy:
   - Al hacer login: verificar contra hash viejo; si OK, re-hashear con algoritmo nuevo y persistir.
   - Nuevos registros/updates: siempre algoritmo nuevo.
   - Columna `passwordHashAlgo` o prefijo tipo `$argon2id$...` para distinguir formatos.
3. Forzar reset de contraseña obligatorio para cuentas admin (cuyos hashes ya podrían estar comprometidos junto con el repo).
4. Política de contraseñas: mínimo 10 caracteres, contrasteada contra top-100k breached (biblioteca local, sin enviar la contraseña a servicios externos).

**Criterio de aceptación:** ningún hash nuevo usa el algoritmo antiguo; plan de erradicación de hashes legacy documentado (deadline + recordatorios forzados).

### Tarea 2.3 — Actualización de dependencias vulnerables (V6)
**Análisis:** `npm audit` reporta CVEs en Next.js (ej. middleware bypass / CVEs de Server Actions) y `xlsx` (SheetJS: prototype pollution CVE-2023-30533 y ReDoS; el paquete en npm quedó congelado, el fix vive solo en el CDN de SheetJS).

**Corrección:**
1. `next` → última versión estable del canal mayor actual (aplicar parches de seguridad recomendados por `next doctor`); revisar changelog de breaking changes y correr suite E2E.
2. `xlsx` (npm) → sustituir por `exceljs` o `sheetjs` instalado desde `https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz`; validar round-trip de imports/exports de precios.
3. Ejecutar `bun/npm audit --production` y elevar a gate de CI (`audit-ci --critical --high`).
4. Activar Dependabot/Renovate con revisión semanal.

**Criterio de aceptación:** `npm audit` = 0 high/critical; gate activo en pipeline.

---

## FASE 3 — P2/P3: Hardening y prevención de regresiones (semana 2)

### Tarea 3.1 — Endurecer uploads (V8)
- Validar MIME real (magic bytes, no solo extensión) para Excel/PDF/imágenes.
- Nombre de archivo generado por servidor (`crypto.randomUUID()`), guardado fuera de `public/`; servir vía endpoint autenticado con `Content-Disposition` y `X-Content-Type-Options: nosniff`.
- Límite de tamaño (ej. 10 MB) rechazado antes de buffer completo (streaming).
- Comprobar canonical path dentro del directorio base para descartar traversal (`../../`).

### Tarea 3.2 — Rate limiting + cabeceras (V9)
- Rate limit en `/api/auth/login` (ej. 5/min por IP+email, con backoff y lockout temporal) usando Upstash Redis o store in-memory multi-instance-safe.
- `next.config.ts` → `headers()`: `Content-Security-Policy` (sin `unsafe-inline` en scripts), `Strict-Transport-Security`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`.
- CSRF: cookies `sameSite` + token doble-submit en mutaciones no GET (si SameSite=None por requisitos).

### Tarea 3.3 — Higiene de errores y logs (V10)
- Handler de errores común: nunca devolver stack traces ni mensajes de Prisma al cliente (mapear a códigos genéricos).
- Redacción automática de secretos/PII en logs (`JWT`, cookies, emails parciales).
- Eliminar del repo artefactos sensibles: `LowVoltageEstimator-v0.2.0-dist.zip`, `db/*.sqlite`, `.env` reales; añadir a `.gitignore` y purgar de historia si contienen datos.

### Tarea 3.4 — Verificación integral y documentación
1. Re-auditar con la misma checklist del diagnóstico original + tests automatizados de autorización (matriz rol × endpoint × propiedad).
2. `npm run build && npm test && audit-ci` verdes.
3. Pen-test manual interno de los flujos críticos (login, alta de precios, import, webhooks).
4. Publicar `SECURITY.md`: proceso de reporte, política de rotación de secretos y runbook de incidentes.

---

## Orden de ejecución resumido

```
Semana 0 (24 h):  1.1 seed-admin → 1.2 JWT secret → 1.3 authz centralizado (rutas críticas primero)
Semana 1:         2.1 SSRF → 2.2 hashing → 2.3 dependencias
Semana 2:         3.1 uploads → 3.2 rate/cabeceras → 3.3 errores/logs → 3.4 re-auditoría
```

## Métricas de éxito
- 0 endpoints públicos capaces de escalar privilegios o destruir datos.
- 0 secretos en repositorio; fail-fast de configuración probado.
- Matriz de autorización 100 % verde en CI; gate `audit-ci` sin high/critical.
- Re-auditoría final sin hallazgos críticos/altos abiertos.
