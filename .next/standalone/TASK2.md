
# Nueva Interfaz Integrada: Cronograma de Sistemas Especiales

### Plataforma: **Low-Voltage Estimator**

## 1. Contexto y Propósito

El módulo **Cronograma de Sistemas Especiales** transforma el presupuesto paramétrico existente en un **plan de ejecución realista**, considerando:
- Ingeniería (existencia/estatus de planos, revisiones, aprobaciones).
- Suministro (Cadena de Suministro, comparativas, proveedor, requisición, OC, anticipo, recepción).
- Ejecución en obra (infraestructura, cableado, montaje, pruebas, capacitación, entrega).

Preguntas que el módulo debe responder:
- ¿El proyecto requiere ingeniería formal o está en proceso?
- ¿Existen planos aprobados por sistema?
- ¿El suministro ya fue gestionado (comparativa, proveedor, OC, anticipo)?
- ¿Qué actividades dependen de obra civil o están bloqueadas?
- ¿Qué tareas están retrasadas y por qué?

## 2. Alcance e Integración (sin alterar el core)

### 2.1 Principio rector
El módulo se integra **sin modificar** la lógica de negocio core del estimador:
- No cambia el motor de cálculo.
- No cambia el catálogo de precios ni su importación.
- Consume el presupuesto como **fuente de datos** para generar actividades iniciales.

### 2.2 Integración funcional con el presupuesto
El cronograma toma información del presupuesto existente:
- Sistemas incluidos en el estimate.
- Cantidades y partidas relevantes (canalización, cableado, equipos, mano de obra, servicios).
- Partidas de cierre: pruebas, capacitación, documentación As Built.

### 2.3 Restricción de “Sistemas”
El estimador opera con un conjunto de sistemas canónicos limitado. El cronograma contemplará sistemas adicionales (p. ej. Intercom/Intrusión/Automatización) como **categorías del cronograma** sin obligar a expandir el enum del core en el MVP.

## 3. Infraestructura Tecnológica Actual (evaluación)

### 3.1 Stack relevante
- Next.js (App Router) + React + TypeScript.
- UI: shadcn/ui + Radix + Tailwind.
- Estado: Zustand (store actual centralizado para el estimador).
- Persistencia: Prisma + SQLite.
- APIs: `src/app/api/*` con handlers `route.ts`.
- Dependencias ya disponibles útiles para este módulo:
  - `@dnd-kit/*` para Kanban con drag & drop.
  - `date-fns` para manejo de fechas.

### 3.2 Puntos de fricción esperados
- UI actual concentrada en una sola página con tabs principales: riesgo de crecimiento monolítico si el módulo se implementa “en línea”.
- Store existente ya gestiona varios dominios: riesgo de acoplamiento si se mezcla el estado del cronograma con el del estimador.
- Almacenamiento de PDFs: para MVP se usará filesystem local; se requiere una ruta configurada por variable de entorno para evitar hardcoding.
- Roles básicos sin autenticación activa: en MVP se modela como datos y validaciones, dejando enforcement para una fase posterior.

## 4. Objetivos y Criterios de Éxito

### 4.1 Objetivos del producto
- Convertir presupuesto a plan ejecutable y rastreable.
- Visibilidad por fases (Ingeniería/Suministro/Obra).
- Detección temprana de riesgos, bloqueos y retrasos.

### 4.2 Objetivos técnicos
- Módulo aislado y modular (evitar código espagueti).
- Interfaces y contratos claros (tipos, APIs, reglas).
- Pruebas suficientes para no comprometer estabilidad.

### 4.3 Criterios de éxito
- Se puede crear/cargar un cronograma por `estimateId`.
- La generación inicial de actividades funciona y es estable.
- La navegación entre pestañas no produce errores de ciclo de vida ni estados corruptos.
- Suite de pruebas existente se mantiene pasando y se agregan pruebas nuevas del módulo.

## 5. Roles, Responsabilidades y Gobernanza (RACI)

### 5.1 Roles operativos del cronograma (MVP)
- PM / Coordinación de Proyecto: prioriza, valida hitos, seguimiento.
- Ingeniería: planos, revisiones, aprobación, alcances técnicos.
- Cadena de Suministro: comparativa, proveedor, requisición, OC, anticipo, recepción.
- Instalación / Comisionamiento: ejecución en sitio, pruebas, entrega, as-built.

### 5.2 RACI sugerido (para implementación)
- Producto/PM: define alcance y criterios de aceptación.
- Frontend: UI/UX, Kanban/Gantt, validaciones y rendimiento.
- Backend: DB/API, storage PDFs, validaciones.
- QA: plan de pruebas, regresión, edge cases.
- DevOps/Infra: configuración de directorio de uploads, backups, observabilidad.

## 6. Fases del Cronograma (modelo funcional)

El cronograma se estructura en cinco fases:

| Fase | Nombre | Objetivo |
|---|---|---|
| 1 | Ingeniería y Diseño | Definir si existe, se requiere o no aplica ingeniería. |
| 2 | Suministro y Logística | Comparativa, proveedor, requisición, OC, anticipo, recepción, liberación. |
| 3 | Infraestructura | Canalizaciones, cajas, charolas, preparaciones. |
| 4 | Cableado y Conectorización | Tendido, etiquetado, remate, pruebas, certificación. |
| 5 | Montaje y Comisionamiento | Instalación, configuración, pruebas, capacitación, entrega. |

## 7. Requisitos Funcionales (PRD)

### 7.1 Requisitos generales
- RF-01: El cronograma debe asociarse a un `estimateId`.
- RF-02: Debe generarse un set inicial de actividades a partir del presupuesto (lineItems) con mapeo por sistema/fase.
- RF-03: Debe permitir CRUD de actividades con estados, responsables, fechas, dependencias, avance y notas.
- RF-04: Debe soportar bloqueos, riesgos y alertas obligatorias.
- RF-05: Debe manejar hitos (milestones) y fecha estimada de término.

### 7.2 Vista: Resumen
Debe mostrar:
- Avance general (promedio ponderado o simple).
- Actividades totales, completadas, retrasadas, bloqueadas.
- Estatus de ingeniería y suministro.
- Fecha estimada de término del cronograma.

Criterios de aceptación:
- Si existe al menos 1 actividad “Bloqueado”, el KPI “Bloqueadas” debe ser > 0.
- Si hay actividades con fin < hoy y estado != Terminado, deben contar como “retrasadas”.

### 7.3 Vista: Gantt (simple)
Debe mostrar:
- Rango de fechas (inicio global a fin global).
- Barras por actividad con inicio/fin.
- Indicadores básicos (estado, retraso).

Criterios de aceptación:
- Al editar fechas de una actividad, la barra se reposiciona sin recargar toda la app.
- Se previene que fin < inicio; se bloquea o corrige con validación.

### 7.4 Vista: Kanban
Debe mostrar:
- Columnas por estado.
- Tarjetas por actividad.
- Movimiento de tarjetas entre columnas (drag & drop).

Criterios de aceptación:
- Al mover una tarjeta, el estado debe persistir.
- Si una actividad está bloqueada, su transición debe restringirse según reglas (configurable).

### 7.5 Vista: Bloqueos
Debe permitir:
- Registrar bloqueo por actividad (motivo, responsable, fecha, severidad).
- Liberación del bloqueo con evidencia/nota.

### 7.6 Vista: Hitos
Debe permitir:
- Crear hitos por fase/sistema (p. ej. “Planos aprobados”, “Material liberado”, “SAT / pruebas finales”, “Entrega”).
- Marcar hitos como cumplidos con fecha real.

### 7.7 Módulo: Ingeniería

Pregunta obligatoria inicial:
> ¿El proyecto cuenta con ingeniería o requiere desarrollo de ingeniería?

Opciones:
```text
Sí, existe ingeniería
No requerido
En proceso
No aplica por remodelación sin afectación a sistemas
```

Si existe ingeniería, debe permitir:
- Subir planos en PDF.
- Clasificar por sistema.
- Registrar revisión, estatus y fecha de carga.

Estatus sugeridos:
```text
Cargado
En revisión
Aprobado
Rechazado
Sustituido
```

Decisión MVP (storage):
- Los PDFs se guardan en filesystem local con ruta configurable (p. ej. `LVE_UPLOAD_DIR`).
- En base de datos se guardan metadatos (nombre, tamaño, ruta, sistema, estatus, revisión).

Si no es requerido:
- Se registra una nota estándar y se evita exigir planos.

Si está en proceso:
- Se muestra alerta de riesgo y se registran responsable y fecha estimada.

Si no aplica (remodelación):
- Justificación obligatoria.

### 7.8 Módulo: Suministro y Logística

Flujo mínimo:
```text
Solicitud de comparativa
↓
Periodo mínimo de comparativa
↓
Recepción de comparativa
↓
Proveedor ganador
↓
Requisición
↓
Orden de compra
↓
Anticipo liberado
↓
Proveedor inicia compra
↓
Recepción de materiales
↓
Liberación para instalación
```

Regla base:
- El proceso de comparativa toma mínimo 2 semanas.

Fechas clave a registrar:
| Fecha | Uso |
|---|---|
| Solicitud a Cadena de Suministro | Inicio formal de comparativa |
| Entrega estimada de comparativa | Fecha mínima esperada |
| Entrega real de comparativa | Cierre real |
| Proveedor ganador | Definición final |
| Requisición | Inicio administrativo |
| OC | Orden formal |
| Anticipo | Condición para compra (si aplica) |
| Recepción | Material en sitio/almacén |
| Liberación | Material validado |

Restricción obligatoria:
- “Proveedor inicia compra” no se libera si no existen proveedor ganador, requisición, OC y anticipo (cuando aplique).

## 8. Requisitos No Funcionales (NFR)

- NFR-01: Modularidad: el dominio “Schedule” debe estar aislado en UI, store, API y lib.
- NFR-02: No alteración del core: el cronograma solo lee presupuesto/lineItems.
- NFR-03: Robustez: validación defensiva de números y estructuras.
- NFR-04: Rendimiento: interacción fluida (tabs, drag & drop, edición) con decenas/cientos de actividades.
- NFR-05: Trazabilidad: timestamps (createdAt/updatedAt) y cambios mínimos auditables.
- NFR-06: Migrabilidad: diseño listo para migrar PDFs a storage externo en el futuro.

## 9. Modelo de Datos (MVP)

Entidades mínimas:

### 9.1 Actividad
Campos:
```text
Nombre
Sistema (del cronograma)
Fase
Fecha inicio
Fecha fin
Duración (derivable)
Responsable / Rol
Estado
Avance %
Dependencias (IDs)
Bloqueos (IDs)
Riesgo
Notas
createdAt / updatedAt
```

### 9.2 Documento de ingeniería (PDF)
Campos:
```text
Sistema asociado
Archivo (nombre, tamaño, ruta local)
Revisión
Estatus del plano
Fecha de carga
Responsable
Notas
createdAt / updatedAt
```

### 9.3 Registro de suministro
Campos:
```text
Fechas clave (solicitud, estimada, real, OC, anticipo, recepción, liberación)
Proveedor ganador (nombre, monto, entrega, condiciones)
Adjunto comparativa (archivo o referencia)
Observaciones
Estatus
createdAt / updatedAt
```

## 10. Reglas de Negocio y Alertas Obligatorias

La interfaz debe alertar cuando:
- Ingeniería “En proceso”.
- No existe ingeniería y no hay justificación.
- Se selecciona “No aplica por remodelación” sin justificación.
- Comparativa programada en menos de 2 semanas desde la solicitud.
- No existe proveedor ganador / requisición / OC / anticipo requerido.
- Se programa montaje antes de condiciones mínimas (acabados, energía regulada, UPS, clima en MDF/IDF, red activa).
- Una actividad está retrasada.
- Una actividad está bloqueada.
- No existe tiempo asignado a pruebas o capacitación antes de entrega.

Cada alerta debe tener:
- Severidad (info/warn/crit).
- Motivo.
- Acción sugerida.

## 11. Diseño Técnico (Arquitectura modular)

### 11.1 Principios
- SOLID: separar dominio, persistencia, API y UI.
- DRY: reglas en funciones puras reutilizables y testeables.
- Integración mínima: el estimador no debe depender del cronograma.

### 11.2 Estructura sugerida
```text
src/
  components/
    schedule/
      ScheduleView.tsx
      ScheduleSummary.tsx
      ScheduleGantt.tsx
      ScheduleKanban.tsx
      ScheduleBlockers.tsx
      ScheduleMilestones.tsx
      ScheduleEngineering.tsx
      ScheduleProcurement.tsx
  lib/
    schedule/
      schedule-types.ts
      schedule-mapper.ts
      schedule-alerts.ts
      schedule-validators.ts
  store/
    schedule-store.ts
  app/
    api/
      schedule/
        route.ts
        activity/[id]/route.ts
        engineering/upload/route.ts
        engineering/[id]/download/route.ts
```

## 12. Plan de Implementación (hitos)

| Hito | Entregable | Dependencias |
|---|---|---|
| H0 | `TASK2.md` actualizado (este documento) | Ninguna |
| H1 | Modelos Prisma + migración + tests de integración | DB |
| H2 | API Schedule (CRUD + upload/download) + tests | H1 |
| H3 | UI ScheduleView + sub-vistas (Resumen/Gantt/Kanban/Ing/Suministro) | H2 |
| H4 | Motor de reglas/alertas + hardening | H3 |
| H5 | Regresión completa + validación end-to-end | H4 |

## 13. Estrategia de Pruebas

- Unit tests:
  - Mapeo presupuesto → actividades.
  - Reglas y alertas (comparativa, precondiciones, retrasos).
- Integration tests:
  - CRUD Schedule con SQLite temporal.
  - Upload/Download de PDF.
- Regresión:
  - Ejecutar suite existente completa.
  - Verificar que exportación PDF de presupuesto no cambia.

## 14. Análisis de Riesgos y Mitigación

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Acoplar cronograma al motor de costos | Alto | Solo lectura de lineItems + capa de mapeo |
| UI monolítica y frágil | Alto | Componente `ScheduleView` aislado + subcomponentes |
| PDFs en filesystem no persistente | Medio/Alto | `UPLOAD_DIR` por env + metadata en DB + plan de migración |
| Diferencias en “sistemas” | Medio | `SCHEDULE_SYSTEMS` propio + mapeos + edición manual |
| Roles sin auth | Medio | Modelar roles como datos; enforcement futuro con auth |

## 15. Validación Post‑Implementación (checklist)

- Abrir estimates antiguos y verificar estabilidad (normalización).
- Crear cronograma en estimate nuevo y en estimate existente.
- Alternar tabs principales repetidamente sin errores.
- Verificar que presupuesto no cambia al generar/editar cronograma.
- Verificar upload/download de PDFs con archivos reales.
- Verificar suite de tests, lint y typecheck.

## 16. Mantenimiento y Evolución

- Mantener el dominio `schedule` aislado y testeado.
- Centralizar reglas en funciones puras y cubrir con tests.
- Preparar fase posterior para:
  - Migrar PDFs a storage externo (S3/Supabase Storage).
  - Auditoría completa y bitácora de cambios.
  - Enforcement de roles con autenticación real.
  - Soporte de múltiples revisiones de cronograma por estimate.
