# Tasks
- [x] Task 1: Levantar estado actual de tabla Presupuesto
  - [x] Identificar wrappers de overflow y el layout actual del table (anchos, min-w, whitespace).
  - [x] Definir el ancho objetivo de la columna Descripción (sin valores arbitrarios) y la estrategia de layout (table-fixed / widths existentes).

- [x] Task 2: Implementar layout sin desbordamiento horizontal en Presupuesto
  - [x] Ajustar el header/celda de "Descripción" para que no expanda el ancho de la tabla.
  - [x] Eliminar wrapper redundante de `overflow-x-auto` en Presupuesto si aplica (manteniendo comportamiento consistente con Table).
  - [x] Validar que todas las columnas se vean simultáneamente en viewport de escritorio típico.

- [x] Task 3: Implementar truncado y tooltip accesible en "Descripción"
  - [x] Renderizar texto truncado con `truncate` y límites de ancho coherentes (`min-w-0`, `overflow-hidden`, `text-ellipsis`).
  - [x] Envolver la celda en Tooltip (Radix) con trigger accesible (foco por teclado y clic).
  - [x] Asegurar ocultamiento automático al perder hover/foco.

- [ ] Task 4: Validación de responsividad y accesibilidad
  - [ ] Verificar navegación por teclado (Tab/Shift+Tab) y foco visible.
  - [ ] Verificar que el tooltip no quede “pegado”/persistente en scroll, blur o mouseleave.
  - [ ] Revisar en distintos tamaños (desktop y pantallas más angostas) sin overflow horizontal.

- [x] Task 5: Pruebas/Regresión
  - [x] Correr `npm test`.
  - [x] Validar que otras tablas (p. ej. Precios) no se vean afectadas si el cambio fue local a Presupuesto.

- [ ] Task 6: Corregir layout (sin solapamiento) y revalidar UI
  - [ ] Ajustar widths responsivos de columnas para evitar que la columna Descripción colapse a 0 y solape headers/celdas.
  - [ ] Evitar overflow horizontal visible en Presupuesto en viewport desktop típico.
  - [ ] Revalidar tooltip (hover/foco/clic) sin interceptación por celdas vecinas.

# Task Dependencies
- Task 2 depende de Task 1
- Task 3 depende de Task 2
- Task 4 depende de Task 3
- Task 6 depende de Task 3
