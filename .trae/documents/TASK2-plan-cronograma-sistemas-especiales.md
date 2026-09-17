# TASK2 — Nueva Interfaz Integrada: Cronograma de Sistemas Especiales

## 0. Resumen

Este documento define (1) una evaluación detallada del contexto actual de **Low-Voltage Estimator** y los posibles puntos de fricción para integrar un nuevo módulo, y (2) un **plan integral** (PRD + plan técnico) para implementar la interfaz **“Cronograma de Sistemas Especiales”** sin alterar la lógica de negocio core (motor de cálculo), evitando acoplamientos y código espagueti, y asegurando estabilidad mediante pruebas y validación post‑integración.

Decisiones ya confirmadas:
- El documento final `TASK2.md` debe incluir **PRD + Plan** (requisitos detallados + plan técnico).
- Para el MVP, la carga de planos PDF se almacenará en **filesystem local**.
- Se contemplarán **roles básicos** (enfoque MVP: campos y validaciones; sin enforcement fuerte si no hay autenticación activa).

## 1. Estado Actual (Grounding en el repositorio)

### 1.1 Stack e infraestructura técnica
- Framework: Next.js (App Router) + React + TypeScript.
- UI: shadcn/ui + Radix, Tailwind CSS.
- Estado: Zustand en un store central [estimate-store.ts](file:///c:/low_voltage_estimator/src/store/estimate-store.ts).
- Persistencia: Prisma + SQLite ([schema.prisma](file:///c:/low_voltage_estimator/prisma/schema.prisma)).
- APIs: rutas `route.ts` bajo [src/app/api](file:///c:/low_voltage_estimator/src/app/api).
- Tests: Node test runner + `tsx` (scripts en [package.json](file:///c:/low_voltage_estimator/package.json)).
- Dependencias útiles ya disponibles para el módulo:
  - `@dnd-kit/*` para drag & drop (Kanban).
  - `date-fns` para fechas/duración.
  - Componentes `Tabs`, `Table`, `Card`, `Calendar` existentes en `src/components/ui`.

### 1.2 Estructura UI actual
- La app UI actualmente vive principalmente en una sola ruta `/` → [page.tsx](file:///c:/low_voltage_estimator/src/app/page.tsx).
- Navegación principal por `Tabs`: Configuración / Precios / Presupuesto / Reportes / Análisis.
- Captura paramétrica por “wizard” interno (`WIZARD_STEPS`) dentro de `page.tsx`.

### 1.3 Lógica core a NO alterar
- Motor de cálculo y reglas de totales en [calculator.ts](file:///c:/low_voltage_estimator/src/lib/calculator.ts).
- Normalización de configuraciones y carga defensiva en [estimate-store.ts](file:///c:/low_voltage_estimator/src/store/estimate-store.ts).
- Regla financiera recordatorio del proyecto (para consistencia): “Gran Total = Subtotal Directo + Indirectos + Utilidad + IVA” (aunque el PDF muestre solo ciertos campos).

### 1.4 Evidencia de requerimiento previo
- Existe un documento `TASK2.md` ya escrito en la raíz del repo: [TASK2.md](file:///c:/low_voltage_estimator/TASK2.md).
- No existe todavía implementación del cronograma en `src/` (no hay rutas/componentes `schedule`, `gantt`, `kanban`).

## 2. Puntos de Fricción (antes de diseñar)

### 2.1 Riesgo de crecimiento monolítico en `page.tsx`
El patrón actual concentra demasiada lógica de UI en una sola página. Integrar un módulo grande (tabs internos + Gantt + Kanban + procurement + upload) dentro de `page.tsx` puede generar:
- Condiciones de render complejas.
- Efectos colaterales entre tabs.
- Dificultad para testear.

Mitigación propuesta:
- Introducir un “contenedor” `ScheduleView` desacoplado, con subcomponentes.
- Mantener `page.tsx` como router de tabs sin lógica de negocio del cronograma.

### 2.2 Store único (Zustand) y riesgo de acoplamiento
`estimate-store.ts` ya contiene múltiples dominios (metadata, configs, factores, resultados, persistencia). Agregar cronograma ahí incrementa el riesgo de:
- Dependencias circulares.
- Re-renders globales.
- Dificultad de mantenimiento.

Mitigación propuesta:
- Crear `src/store/schedule-store.ts` independiente.
- El cronograma se “ancla” por `estimateId` (leído desde `useEstimateStore()`), pero no modifica la lógica de cálculo.

### 2.3 “Sistemas” del cronograma vs sistemas del estimador
El cronograma pide sistemas adicionales (Voz y datos, Intrusión, Intercom, Automatización) que hoy NO existen en `SYSTEMS` del core ([constants.ts](file:///c:/low_voltage_estimator/src/lib/constants.ts)).

Mitigación propuesta:
- Definir un enum/lista `SCHEDULE_SYSTEMS` propio del módulo (no reutilizar `SYSTEMS` del core).
- Implementar mapeos:
  - “Voz y datos” ↔ principalmente `CABLEADO` (con etiqueta UI distinta).
  - “Automatización/Intercom/Intrusión” ↔ `GENERAL` en generación automática, permitiendo edición manual posterior.
- Evitar expandir `SYSTEMS` del core en el MVP para no alterar importación de precios, catálogo y motor.

### 2.4 PDF en filesystem local (MVP) en entorno Next standalone
Guardar PDFs en filesystem es viable en despliegues con disco persistente, pero es frágil en serverless/containers efímeros.

Mitigación propuesta:
- Definir `UPLOAD_DIR` configurable por env (p. ej. `LVE_UPLOAD_DIR`).
- Guardar metadata en DB (ruta, hash opcional, tamaño).
- Mantener contrato de backend que permita migrar fácilmente a storage externo en fase posterior.

### 2.5 “Roles básicos” sin autenticación activa
`next-auth` está en dependencias, pero no hay rutas/flujo de autenticación evidentes en `src/app/api/auth`.

Mitigación propuesta:
- Modelar roles/responsables como campos (p. ej. `role`, `owner`, `assignee`) y validaciones UI.
- Dejar el enforcement de permisos como fase posterior (cuando exista auth).

## 3. Objetivo y Criterios de Éxito

### 3.1 Objetivo de producto (PRD)
Convertir el presupuesto paramétrico en un plan de ejecución realista con:
- Fases de ingeniería, suministro y ejecución en obra.
- Dependencias y bloqueos.
- Hitos, estados, avance.
- Visibilidad (Resumen, Gantt, Kanban, Ingeniería, Suministro).

### 3.2 Objetivo técnico
Integrar el módulo sin romper:
- Motor de cálculo.
- Importación de precios.
- Persistencia de presupuestos y ediciones manuales.

### 3.3 Criterios de éxito (medibles)
- El cronograma se puede crear/cargar por `estimateId` y persiste.
- La generación inicial de actividades desde el presupuesto funciona y no altera el presupuesto.
- La UI se mantiene estable al alternar tabs (sin errores de ciclo de vida, sin `undefined.reduce`).
- Suite de tests pasa; se agregan tests nuevos para endpoints y reglas.

## 4. Requisitos del Módulo (para re‑redactar en TASK2.md)

### 4.1 Requisitos funcionales (FR)
- FR‑01: Crear cronograma asociado a un `Estimate`.
- FR‑02: Generar actividades iniciales desde el presupuesto (lineItems) con reglas de mapeo por sistema/fase.
- FR‑03: CRUD de actividades (nombre, fase, sistema, fechas, duración, responsable, estado, avance, notas).
- FR‑04: Dependencias y bloqueos (p. ej. infraestructura antes de cableado).
- FR‑05: Vista Resumen (KPI: avance, bloqueadas, retrasadas, fecha fin estimada).
- FR‑06: Vista Gantt simple (barra por actividad en rango de fechas).
- FR‑07: Vista Kanban por estado con drag & drop (`@dnd-kit`).
- FR‑08: Módulo Ingeniería: capturar estado + subir PDF + clasificar por sistema + estatus de revisión.
- FR‑09: Módulo Suministro: workflow de comparativa → proveedor → requisición → OC → anticipo → recepción → liberación.
- FR‑10: Alertas obligatorias (reglas de negocio del cronograma).
- FR‑11: Roles básicos (campos/validaciones): PM, Ingeniería, Cadena de Suministro, Instalación/Comisionamiento.

### 4.2 Requisitos no funcionales (NFR)
- NFR‑01: Modularidad: dominio “Schedule” aislado (UI, store, API, DB).
- NFR‑02: No alterar el cálculo core (solo lectura del presupuesto).
- NFR‑03: Rendimiento: UI responsiva con datasets medianos (decenas‑cientos de actividades).
- NFR‑04: Robustez: validación defensiva (no `NaN`, no `undefined` en arrays).
- NFR‑05: Trazabilidad: timestamps y auditoría mínima (createdAt/updatedAt) para entidades de cronograma.
- NFR‑06: Portabilidad: storage PDF local con interfaz para migrar a externo.

## 5. Diseño de Arquitectura (SOLID/DRY, modular y testable)

### 5.1 Capas propuestas
- **Dominio (lib)**: reglas, enums del cronograma, mapeo presupuesto→actividades, validadores.
  - `src/lib/schedule/*`
- **Persistencia (Prisma)**: modelos Schedule y relacionados.
  - `prisma/schema.prisma` + migración
- **API (Next route handlers)**: endpoints CRUD y upload.
  - `src/app/api/schedule/*`
- **Estado UI (Zustand)**: store dedicado al módulo.
  - `src/store/schedule-store.ts`
- **UI (React components)**: vista principal + sub-vistas.
  - `src/components/schedule/*` (nuevo)
- **Integración**: un nuevo tab “Cronograma” en `src/app/page.tsx` que renderiza `ScheduleView` y pasa `estimateId`.

### 5.2 Modelo de datos (MVP)
Se propone agregar estos modelos (nombres referenciales):
- `Schedule` (1:1 con `Estimate` o 1:N si se permiten revisiones).
- `ScheduleActivity`
- `ScheduleMilestone`
- `ScheduleBlocker`
- `EngineeringDocument` (metadatos + path de PDF)
- `ProcurementRecord` (fechas clave y estado)

Decisión recomendada para MVP:
- `Schedule` 1:1 con `Estimate` (simplifica UX y consultas).

### 5.3 Generación de actividades desde presupuesto (algoritmo)
Entrada:
- `estimate.result.lineItems` (si existe) o `Estimate.lineItems` desde BD.

Salida:
- Actividades por fase/sistema con cantidades y categorías como “evidencia”.

Reglas iniciales (editables):
- `system === "CANALIZACION"` → Fase 3 (Infraestructura).
- `system === "CABLEADO"` → Fase 4 (Cableado y Conectorización).
- `system in ["CCTV","ACCESO","VOCEO","INCENDIO","GENERAL"]` → Fase 5 (Montaje y Comisionamiento) con actividades por sistema.
- Actividades transversales (p. ej. “Pruebas”, “Capacitación”, “As Built”) se agregan siempre al final.

Nota:
- La generación debe ser **idempotente** con estrategia clara:
  - Opción A: solo generar en creación (no re-generar).
  - Opción B: re-generar con “merge” sin perder ediciones.
Recomendación MVP: Opción A + botón explícito “Regenerar (avanzado)” en fase posterior.

## 6. Plan de Implementación (hitos + entregables)

### 6.1 Hito 0 — Re‑elaboración de `TASK2.md` (PRD + Plan)
Entregable:
- Reescritura/expansión de [TASK2.md](file:///c:/low_voltage_estimator/TASK2.md) con estructura formal:
  - Contexto y alcance.
  - Stakeholders y roles.
  - Vistas (Resumen/Gantt/Kanban/Ingeniería/Suministro) con user stories.
  - Reglas/alertas con criterios de aceptación.
  - Modelo de datos propuesto.
  - APIs y contratos.
  - Plan de implementación por fases.
  - Riesgos y mitigaciones.
  - Estrategia de pruebas y validación.
  - Mantenimiento.

### 6.2 Hito 1 — Persistencia (Prisma)
Cambios:
- `prisma/schema.prisma`: añadir modelos del cronograma y relación con `Estimate`.
- Migración Prisma (dev/prod).
Pruebas:
- Tests de integración con SQLite temporal (patrón ya usado en `tests/prices-crud.test.ts`).

### 6.3 Hito 2 — API del cronograma
Endpoints sugeridos (MVP):
- `GET /api/schedule?estimateId=...` (load)
- `POST /api/schedule` (create from estimate / generate activities)
- `PUT /api/schedule/activity/[id]` (update activity)
- `POST /api/schedule/engineering/upload` (PDF upload, multipart/form-data)
- `GET /api/schedule/engineering/[id]/download` (servir PDF del filesystem)

Validaciones:
- Zod en endpoints.
- Protección defensiva: fechas válidas, `Number.isFinite` para % avance.

### 6.4 Hito 3 — UI: ScheduleView + sub-vistas
Componentes:
- `ScheduleView` (contenedor, tabs internas)
- `ScheduleSummary`
- `ScheduleGantt` (simple, sin librería externa)
- `ScheduleKanban` (dnd-kit)
- `ScheduleEngineering` (upload/listado/estatus)
- `ScheduleProcurement` (workflow)
- `ScheduleBlockers`, `ScheduleMilestones`

Integración:
- Nuevo `TabsTrigger/TabsContent` en [page.tsx](file:///c:/low_voltage_estimator/src/app/page.tsx) para “Cronograma”.

### 6.5 Hito 4 — Reglas/alertas y validaciones cruzadas
Implementar motor de alertas del cronograma (puro/funcional) para test unitario:
- Comparativa < 2 semanas.
- Montaje antes de acabados/energía/UPS (según checks de precondición configurables).
- Ingeniería “en proceso”.
- Procurement incompleto para liberar “compra”.

### 6.6 Hito 5 — Pruebas, hardening y regresión
Pruebas mínimas:
- Unit tests: mapeo de actividades, reglas de alertas.
- Integration tests: CRUD schedule, upload/download PDF.
- Regresión: correr suite completa existente.
Validación manual:
- Crear estimate → calcular → guardar → entrar cronograma → generar → editar → volver a presupuesto → verificar no hay alteración de lineItems.

## 7. Cronograma de Hitos (sección para el `TASK2.md` final)

Formato recomendado: tabla por hito con dependencia y entregable verificable.
- H0: Documento actualizado (PRD + plan técnico).
- H1: DB lista (modelos + migración + tests).
- H2: API lista (CRUD + upload + tests).
- H3: UI lista (tabs + vistas base).
- H4: Alertas/reglas completas.
- H5: Suite estable + verificación end‑to‑end.

## 8. Responsabilidades (RACI recomendado)

Propuesta para `TASK2.md` (ajustable a la org real):
- Producto/PM: define alcance, prioridades, aceptación.
- Frontend: UI/UX, Kanban/Gantt, validaciones, rendimiento.
- Backend: Prisma + APIs + almacenamiento de PDFs + validaciones.
- QA: plan de pruebas, regresión, casos edge.
- DevOps/Infra: configuración de `UPLOAD_DIR`, backups, observabilidad.

## 9. Riesgos y Mitigación (lista base)

- Riesgo: acoplamiento con el motor de cálculo → Mitigar: solo lectura de `lineItems`, capa de mapeo en `src/lib/schedule`.
- Riesgo: filesystem no persistente → Mitigar: env configurable + plan de migración a storage externo.
- Riesgo: discrepancia de “sistemas” → Mitigar: `SCHEDULE_SYSTEMS` propio + mapeo.
- Riesgo: falta de auth real para roles → Mitigar: roles como datos; enforcement futuro.
- Riesgo: re-render/performance por dnd y gantt → Mitigar: memoización, virtualización si escala (fase posterior).

## 10. Pasos de Validación Post‑Implementación

Checklist sugerido para liberar:
- Abrir estimates existentes (datos legacy) y confirmar normalización estable.
- Crear cronograma desde estimate con y sin `result` persistido.
- Alternar tabs repetidamente (Config/Presupuesto/Cronograma) sin errores.
- Export PDF del presupuesto sigue igual.
- Upload/descarga de PDF funciona con archivos reales y tamaños razonables.
- Tests y typecheck sin errores.

## 11. Directrices de Mantenimiento a Largo Plazo

- Mantener el dominio “Schedule” aislado (no mezclar lógica en `page.tsx`).
- Preferir funciones puras para reglas (alertas, mapeos) y cubrir con tests.
- Definir contratos estables de API (tipos compartidos si aplica).
- Preparar una fase posterior para:
  - Migrar PDFs a storage externo.
  - Agregar auditoría completa y enforcement de roles con auth real.
  - Soportar múltiples revisiones de cronograma por estimate.

