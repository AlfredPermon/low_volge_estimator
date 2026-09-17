# Plan de Mejoras — Low Voltage Estimator basado en análisis de TASK.md

## 1. Resumen Ejecutivo

Tras analizar el documento `TASK.md` como caso de estudio y contrastarlo con la solución actualmente en desarrollo (Next.js 16 + React 19 + TypeScript + Zustand + Prisma + SQLite + shadcn/ui), se identifican **20 propuestas de mejora concretas** agrupadas en **7 dimensiones técnicas y funcionales**. El objetivo es incorporar al proyecto las prácticas, validaciones, módulos y reglas de negocio que el TASK.md define como base funcional, técnica y financiera, alineando la solución con los principios de cálculo paramétrico auditables y libres de los errores típicos de Excel.

**Decisión clave del análisis**: el TASK.md es **altamente compatible** con la arquitectura actual (motor de cálculo desacoplado, store centralizado, tipos de datos explícitos, esquema jerárquico 5.7.x). No requiere un rewrite; las mejoras se implementan como **extensiones progresivas** sobre los módulos existentes.

---

## 2. Estado Actual — Línea Base

### 2.1 Lo que YA está alineado con TASK.md
- ✅ **Motor de cálculo desacoplado** (`src/lib/calculator.ts`) — coincide con §5 y §16 del TASK.
- ✅ **Fórmulas de cálculo** (Costo Directo = Material + MO; Indirecto = CD × %; Utilidad = (CD + Ind) × %) — coincide con §5.
- ✅ **Jerarquía de sistemas con códigos 5.7.x** (5.7.3 CCTV, 5.7.4 Acceso, 5.7.5 Voceo, 5.7.6 Incendio) — coincide con §4.
- ✅ **Cálculo dinámico en tiempo real** — cantidad y P.U. editables disparan recálculo (§5, requisito de UI).
- ✅ **Store centralizado con normalización** (`src/store/estimate-store.ts`) — `normalizeLineItem` resuelve el bug `totalAmount` vs `total` documentado en lecciones aprendidas.
- ✅ **Catálogo maestro de precios** (`PriceItem` con system, category, brand, model) — coincide con §9.4.
- ✅ **Exportación CSV** con agrupamiento por sistema y subtotales — versión básica de §17.
- ✅ **Validación de inputs numéricos** (min=0 en todos los formularios).
- ✅ **Schema Prisma normalizado** con iva, indirecto y utilidad como campos — base para §9.1.

### 2.2 Brechas detectadas vs TASK.md
| # | Brecha | Sección TASK.md | Criticidad |
|---|--------|-----------------|-----------|
| 1 | Sin configuración de Mano de Obra por **cuadrilla** (Técnico/Oficial/Ayudante) | §6, §9.5 | Alta |
| 2 | Sin cálculo de **IVA** en totales | §9.1, §7 | Alta |
| 3 | Sin **normalización de unidades** (m.l., ml, mts., pza.) | §11.3 | Alta |
| 4 | Sin **validación de códigos duplicados** | §11.2, §12 | Alta |
| 5 | Sin **alertas** en la UI (códigos duplicados, MO en 0, etc.) | §13 | Media |
| 6 | Sin **exportación a PDF** | §14.6, §17 | Media |
| 7 | Sin **historial de costos** / auditoría | §14.7, §18.3 | Media |
| 8 | Sin **revisión de presupuesto** (rev number) | §9.1 | Media |
| 9 | Sin **observaciones** del proyecto | §9.1 | Baja |
| 10 | Sin **plantillas por tipo de proyecto** | §18.4 | Baja |
| 11 | Sin **reportes detallados** (análisis P.U., resumen MO, comparativo de revisiones) | §17 | Media |
| 12 | Códigos de partida **auto-generados** sin permitir captura manual | §15.2 | Baja |
| 13 | Sin **módulo de mano de obra** editable con tarifas y rendimientos | §9.5, §14.4 | Alta |
| 14 | Sin **identificador único UUID** explícito en LineItem (sólo `partida` + `code`) | §18.2 | Media |
| 15 | Sin **política explícita de redondeo** configurable (sólo round(2) fijo) | §11.4 | Baja |
| 16 | Sin **importación de conceptos** desde Excel (sólo precios) | §18.5 | Media |
| 17 | `ivaRate` está en el schema Prisma pero **no se usa** | §9.1 | Alta |
| 18 | Falta **frente o área** en el modelo de concepto | §9.3 | Baja |
| 19 | Sin **campos de proveedor, ficha técnica, certificaciones, observaciones** en PriceItem | §9.4 | Media |
| 20 | Sistema INCENDIO con código **5.7.6** vs TASK indica **5.7.5** Detection and Alarm | §4 | Baja |

---

## 3. Puntos Fuertes del TASK.md (a preservar en la implementación)

| Fortaleza | Aplicación en nuestro proyecto |
|-----------|-------------------------------|
| Estructura jerárquica clara (5 > 5.7 > 5.7.5 > concepto) | Mantener prefijo `5.7.x` en el motor de cálculo |
| Separación entre datos, cálculo y presentación (§18.1) | Arquitectura actual YA cumple — documentar como principio |
| Uso de identificador interno UUID + código visible (§18.2) | Adoptar `id` autogenerado + `code` editable por usuario |
| Validaciones numéricas mínimas (no negativos, no nulos) | Continuar con `Math.max(0, ...)` y validaciones Zod en API |
| Fórmulas transparentes y auditables | Mostrar fórmulas en panel lateral (ya implementado en `FactorsPanel`) |
| Parámetros financieros configurables (no hardcoded) | Mantener factores en el store y en el schema |
| Cálculo en servidor con datos reales | El endpoint `POST /api/estimates/[id]/calculate` ya lo hace |

---

## 4. Propuestas de Mejora Concretas (alineadas al TASK.md)

Las propuestas se agrupan en **7 dimensiones** y están priorizadas por impacto/viabilidad.

### Dimensión A — Reglas de Negocio y Motor de Cálculo
Mejoras que afectan directamente la lógica financiera y de cálculo.

#### A1. Incorporar cálculo de IVA configurable
- **Referencia TASK**: §9.1 (IVA aplicable), §7 (Total con IVA), §10 (IVA 16% configurable)
- **Archivos**: `src/lib/calculator.ts`, `src/store/estimate-store.ts`, `src/components/estimator/budget-view.tsx`, `prisma/schema.prisma`
- **Cambios**:
  - Confirmar/activar `ivaRate` en el modelo (ya existe pero no se calcula)
  - Añadir `iva` y `totalWithIva` al `CalculationResult`
  - Mostrar dos líneas adicionales en el resumen: `IVA (16%)` y `TOTAL con IVA`
  - Persistir `ivaRate` en cada `Estimate` (ya en schema)
- **Viabilidad**: Alta — sólo agregar dos campos numéricos y mostrarlos.

#### A2. Modelo de Mano de Obra por Cuadrilla
- **Referencia TASK**: §6 (cuadrilla), §9.5 (catálogo MO), §14.4 (módulo MO)
- **Archivos nuevos**: `src/lib/labor-calculator.ts`, `src/components/estimator/labor-panel.tsx`
- **Cambios**:
  - Crear tipo `LaborRate { technician: number; officer: number; helper: number }` (defaults 950/750/500)
  - Crear tipo `CrewTemplate { id, name, technicianQty, officerQty, helperQty, deviceType }`
  - Añadir `laborRates` y `crewTemplates` al store con persistencia
  - Calcular `ManoObra = Σ(qty × tarifa)` para cada concepto en lugar de costo plano
  - Mostrar desglose: "0.3 técnicos + 0.3 oficiales + 0.3 ayudantes" en cada línea
  - Exponer configuración editable en un nuevo panel
- **Viabilidad**: Media — requiere refactor de la función `runCalculation`.

#### A3. Política de redondeo configurable
- **Referencia TASK**: §10 (política redondeo), §11.4
- **Archivos**: `src/lib/calculator.ts`, `src/lib/utils.ts`, `src/store/estimate-store.ts`
- **Cambios**:
  - Añadir `roundingPolicy: 0 | 2 | 4` (decimales) al `EstimateFactors`
  - Crear helper `round(value, policy)` que centralice todos los redondeos
  - Reemplazar `Math.round(n * 100) / 100` en el motor por la nueva función
- **Viabilidad**: Alta — refactor mínimo.

#### A4. Códigos de partida editables + identificador UUID
- **Referencia TASK**: §15.2, §18.2
- **Archivos**: `src/lib/calculator.ts`, `src/store/estimate-store.ts`, `prisma/schema.prisma`
- **Cambios**:
  - Añadir campo `id: string` (cuid) a `LineItem`
  - Permitir que el usuario edite el campo `code` en `BudgetView`
  - Mantener `partida` como código jerárquico (5.7.3.01) y `code` como código de negocio (CCTV-CAM-001)
- **Viabilidad**: Alta.

### Dimensión B — Validaciones y Alertas (TASK §11, §12, §13)

#### B1. Validador de códigos duplicados
- **Archivos**: `src/store/estimate-store.ts`, nuevo `src/lib/validators.ts`
- **Cambios**:
  - Función `validateLineItems(items)` que retorna `{ warnings: ValidationAlert[] }`
  - Detecta: códigos duplicados, cantidad 0 con costo, material en 0, MO en 0, etc.
  - Catálogo de alertas tipadas: `code_duplicate`, `quantity_zero_with_cost`, `material_zero`, `labor_zero`, `unit_unknown`, `system_empty`
- **Viabilidad**: Alta.

#### B2. Panel de alertas en BudgetView
- **Archivos**: `src/components/estimator/budget-view.tsx`
- **Cambios**:
  - Renderizar sección de advertencias encima de la tabla con badges semánticos (warning/error)
  - Usar componente shadcn `Alert` con variant `destructive` para errores y `default` para advertencias
- **Viabilidad**: Alta.

#### B3. Normalizador de unidades
- **Referencia TASK**: §11.3
- **Archivos**: `src/lib/unit-normalizer.ts`
- **Cambios**:
  - Diccionario de variantes: `{ 'm.l.': 'ML', 'ml': 'ML', 'mts.': 'ML', 'm': 'ML', 'pza.': 'PZA', 'pz': 'PZA', 'lote': 'LOTE' }`
  - Aplicar normalización al cargar precios y al construir LineItems
  - Mostrar siempre unidad normalizada
- **Viabilidad**: Alta.

### Dimensión C — Modelo de Datos y Persistencia

#### C1. Ampliar el modelo `PriceItem` con campos faltantes
- **Referencia TASK**: §9.4
- **Archivos**: `prisma/schema.prisma`
- **Campos a añadir**: `provider String @default("")`, `certifications String @default("")` (CSV), `datasheetUrl String @default("")`, `notes String @default("")`, `lastUpdatedBy String @default("")`, `priceHistory String @default("[]")` (JSON de cambios)
- **Viabilidad**: Alta — migración simple con `prisma db push`.

#### C2. Añadir revisión y observaciones al `Estimate`
- **Referencia TASK**: §9.1
- **Archivos**: `prisma/schema.prisma`, `src/app/page.tsx` (formulario de proyecto)
- **Campos**: `revision String @default("Rev. 1")`, `notes String @default("")`, `responsible String @default("")`
- **Mostrar** en el header del `BudgetView` y como campos editables en el wizard de proyecto.
- **Viabilidad**: Alta.

#### C3. Historial de costos (price history)
- **Referencia TASK**: §18.3
- **Archivos**: `prisma/schema.prisma`, nuevo `src/lib/price-history.ts`, nuevo endpoint `src/app/api/prices/[id]/history/route.ts`
- **Cambios**:
  - Crear modelo `PriceHistory { id, priceItemId, previousCost, newCost, changedBy, changedAt, reason }`
  - Hook en `PUT /api/prices/[id]` que registra cambios de `unitCost`
  - Vista en `PricesView` con timeline de cambios por ítem
- **Viabilidad**: Media.

### Dimensión D — Reportes y Exportación

#### D1. Exportación a PDF
- **Referencia TASK**: §14.6, §17
- **Archivos nuevos**: `src/lib/pdf-export.ts`, dependencia `@react-pdf/renderer` (añadir a `package.json`)
- **Cambios**:
  - Función `exportToPDF(estimate, result)` que genera PDF con: header (logo, datos del proyecto), tabla de partidas, resumen financiero
  - Botón "PDF" junto al botón "CSV" en `BudgetView`
- **Viabilidad**: Media — requiere añadir dependencia.

#### D2. Reporte "Análisis de Precio Unitario"
- **Referencia TASK**: §17.2
- **Archivos**: `src/components/estimator/budget-view.tsx`, modal o vista expandida por línea
- **Cambios**:
  - Modal/accordion por línea que muestra: Material, Mano de Obra, Indirecto, Utilidad, Precio Unitario
  - Sólo es posible si A2 (mano de obra por cuadrilla) se implementa, o se muestra el desglose actual desde `LineItem` si los campos existen
- **Viabilidad**: Media (depende de A2).

#### D3. Resumen de Mano de Obra y Materiales
- **Referencia TASK**: §17.4, §17.5
- **Archivos**: nuevo `src/components/estimator/reports-view.tsx`
- **Cambios**:
  - Nueva pestaña "Reportes" con 3 tabs internas:
    - Resumen Materiales: agrupado por categoría con totales
    - Resumen MO: técnicos/oficiales/ayudantes y horas equivalentes
    - Comparativo de revisiones: si hay múltiples revisiones, mostrar diff
- **Viabilidad**: Media.

### Dimensión E — Experiencia de Usuario y Flujo

#### E1. Módulo de Mano de Obra editable (UI)
- **Referencia TASK**: §14.4
- **Archivos**: nuevo `src/components/estimator/labor-panel.tsx`
- **Cambios**:
  - Nueva pestaña/wizard step: "Mano de Obra"
  - Editor de tarifas (3 inputs numéricos: técnico, oficial, ayudante)
  - Editor de plantillas de cuadrilla (tabla con: tipo concepto, técnico, oficial, ayudante)
  - Conectado al store y persistido
- **Viabilidad**: Alta.

#### E2. Wizard con paso adicional "Validaciones"
- **Archivos**: `src/app/page.tsx`
- **Cambios**:
  - Añadir paso 7: muestra resumen de alertas y permite continuar si todo está OK
  - Mostrar contador de advertencias en el stepper
- **Viabilidad**: Alta.

#### E3. Vista de Análisis (gráficos)
- **Archivos**: nuevo `src/components/estimator/analytics-view.tsx`
- **Cambios**:
  - Usar `recharts` (ya en `package.json`) para mostrar:
    - Pie chart: distribución por sistema
    - Bar chart: costo directo vs indirecto vs utilidad
    - Tabla de Pareto de conceptos más caros
- **Viabilidad**: Alta — la dependencia ya existe.

### Dimensión F — Integración y Extensibilidad

#### F1. Importación de conceptos desde Excel
- **Referencia TASK**: §18.5
- **Archivos**: `src/app/api/prices/import/route.ts` (existente, ampliar), `src/components/estimator/prices-view.tsx`
- **Cambios**:
  - Validar durante import: códigos duplicados, campos vacíos, unidades no reconocidas, valores negativos, errores `#REF!`, conceptos sin sistema
  - Reporte de validación post-import (cuántos se importaron, cuántos fallaron y por qué)
- **Viabilidad**: Media — depende del parser actual.

#### F2. Plantillas por tipo de proyecto
- **Referencia TASK**: §18.4
- **Archivos**: nuevo `src/lib/templates.ts`, `src/components/estimator/templates-view.tsx`
- **Cambios**:
  - Modelo `ProjectTemplate { id, name, type (hospital|corporate|branch|office|parking|critical|monitoring), systemConfigs, factors }`
  - Selector de plantilla al crear nuevo presupuesto
  - Pre-rellena los `factors` y `systemConfigs` con valores por defecto
- **Viabilidad**: Media.

#### F3. Módulo de Auditoría
- **Referencia TASK**: §14.7
- **Archivos**: `prisma/schema.prisma`, nuevo `src/lib/audit.ts`
- **Cambios**:
  - Modelo `AuditLog { id, entityType, entityId, action, userId, changes (JSON), createdAt }`
  - Registrar automáticamente: creación de presupuesto, modificación de cantidades, cambios de factores, recálculos
- **Viabilidad**: Media.

### Dimensión G — Calidad y Robustez

#### G1. Política explícita de redondeo en subtotales
- Cubierto en A3.

#### G2. Tests unitarios del motor de cálculo
- **Archivos**: `tests/calculator.test.ts`, `tests/labor-calculator.test.ts`, `tests/validators.test.ts`
- **Cambios**:
  - Tests con Vitest (añadir devDependency) cubriendo: fórmulas, normalización, validaciones, recálculo en edición
  - Caso de prueba canónico basado en UCIA: $249,492.49 MXN
- **Viabilidad**: Alta.

#### G3. Reindexar sistema INCENDIO a 5.7.5
- **Archivos**: `src/lib/calculator.ts` (línea 521, 527, …)
- **Cambio**: Reemplazar prefijo `5.7.6` por `5.7.5` para alinear con §4 del TASK.
- **Viabilidad**: Trivial.

---

## 5. Plan de Implementación por Fases

### Fase 1 — Reglas de Negocio Críticas (Impacto Alto, Esfuerzo Bajo)
**Objetivo**: cerrar las brechas regulatorias más urgentes del TASK.md.
1. **A1** — IVA configurable y visible en totales
2. **A3** — Política de redondeo centralizada
3. **A4** — Identificador UUID + código editable
4. **B1** — Validador de códigos duplicados
5. **B2** — Panel de alertas en BudgetView
6. **B3** — Normalizador de unidades
7. **C2** — Revisión y observaciones en Estimate
8. **G3** — Reindexar INCENDIO a 5.7.5
9. **G2** — Tests unitarios del motor (mínimo 5 casos)

**Criterio de éxito**: el motor de cálculo cumple con §5, §7, §10, §11, §12 del TASK.

### Fase 2 — Modelo de Mano de Obra y Reportes Básicos (Impacto Alto, Esfuerzo Medio)
**Objetivo**: incorporar el modelo de cuadrilla y los reportes clave.
1. **A2** — Modelo de Mano de Obra por Cuadrilla
2. **E1** — Panel de Mano de Obra editable
3. **C1** — Ampliar `PriceItem` con proveedor, certificaciones, datasheet
4. **D1** — Exportación a PDF
5. **D3** — Resumen de Materiales y MO

**Criterio de éxito**: las partidas muestran desglose real de MO y el PDF se genera correctamente.

### Fase 3 — Inteligencia de Negocio y Trazabilidad (Impacto Medio, Esfuerzo Medio)
**Objetivo**: añadir las capacidades analíticas y de auditoría.
1. **C3** — Historial de costos
2. **D2** — Análisis de Precio Unitario por línea
3. **E2** — Wizard con paso de Validaciones
4. **E3** — Vista de Análisis con gráficos
5. **F1** — Importación validada de Excel

**Criterio de éxito**: el usuario puede ver gráficos, revisar el APU de cada línea y validar el Excel de origen.

### Fase 4 — Escalabilidad y Extensibilidad (Impacto Medio, Esfuerzo Alto)
**Objetivo**: sentar las bases para multi-proyecto, multi-tenant, multi-divisa.
1. **F2** — Plantillas por tipo de proyecto
2. **F3** — Módulo de Auditoría
3. Refinamiento de UX y performance

**Criterio de éxito**: el sistema soporta flujos de trabajo empresarial complejos.

---

## 6. Suposiciones y Decisiones Tomadas

- **Idiomas y unidades monetarias**: se mantiene MXN como moneda principal y USD como alternativa (ya implementado).
- **Idioma de la UI**: español (preferencias del usuario).
- **Persistencia**: SQLite (suficiente para MVP, migrable a PostgreSQL en Fase 4).
- **No se reescribe el motor de cálculo**: las mejoras son incrementales y compatibles con `runCalculation()`.
- **El TASK.md se trata como referencia conceptual**: no se implementan literalmente sus 14 módulos (sería un proyecto de 6+ meses), sino las brechas detectadas que aportan valor inmediato.
- **No se elimina la generación automática de códigos de partida**: se complementa con edición manual.
- **PDF se construye client-side** con `@react-pdf/renderer` para no sobrecargar el backend.
- **Tests**: Vitest por simplicidad y compatibilidad con Vite/Next.

---

## 7. Verificación

### Verificación técnica (al final de cada fase)
- ✅ Lint pasa sin errores (`bun run lint`)
- ✅ Build de producción exitoso (`bun run build`)
- ✅ Tests del motor verdes (`bun test`)
- ✅ Flujo end-to-end: crear → configurar → calcular → editar → exportar CSV/PDF
- ✅ Cálculo recalcula en tiempo real al editar cantidad/P.U. (requisito de UI)

### Verificación funcional (criterio de aceptación por fase)
- **Fase 1**: el subtotal de UCIA coincide con $249,492.49 ±$1 MXN usando los factores del TASK (25% indirecto, 13% utilidad, 16% IVA).
- **Fase 2**: las líneas de MO muestran desglose `0.3T + 0.3O + 0.3A` y el PDF incluye todas las partidas con formato profesional.
- **Fase 3**: la importación de Excel detecta y reporta códigos duplicados y errores `#REF!`.
- **Fase 4**: el usuario puede seleccionar "Plantilla Hospital" al crear un nuevo presupuesto.

### Verificación visual
- Captura de pantalla del BudgetView con totales, alertas y subtotales por sistema.
- Captura del PDF exportado.
- Captura de la vista de análisis con gráficos.

---

## 8. Riesgos Identificados

| Riesgo | Mitigación |
|--------|-----------|
| Refactor del motor de cálculo podría romper compatibilidad con estimaciones existentes | Mantener `runCalculation` con misma firma; añadir campos opcionales al resultado |
| Añadir dependencias (PDF, Vitest) aumenta tamaño del bundle | Usar dynamic imports para PDF; tree-shaking en build |
| Modelo de MO por cuadrilla requiere cambios profundos en `runCalculation` | Hacerlo en Fase 2 aislado del resto; mantener flag `useCrewBasedLabor` para rollback |
| Historial de costos puede crecer mucho | Estrategia de purga: mantener últimos 50 cambios por ítem |

---

## 9. Próximo Paso

Una vez aprobado este plan, se procederá a implementar la **Fase 1** completa, con commits incrementales por cada propuesta A1, A3, A4, B1, B2, B3, C2, G2, G3. Al finalizar la fase, se ejecutarán las verificaciones técnicas y se entregará un resumen con capturas y métricas.
