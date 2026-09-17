# Presupuestos Recientes — Listado inteligente

## Objetivo
Mejorar la gestión del listado de “Presupuestos Recientes” en Configuración para que:

- Se ordene de forma inteligente por último acceso.
- Permita filtrar por nombre/proyecto/cliente, estado y ventana temporal.
- Registre automáticamente proyectos nuevos y actualice su posición al ser accedidos.
- Mantenga compatibilidad con la fuente de datos existente (`/api/estimates`) y no afecte el guardado manual.

## Fuente de datos (sin cambios)
- La lista base sigue viniendo de `GET /api/estimates`.
- Carga de detalle se mantiene en `GET /api/estimates/:id`.
- Guardado manual se mantiene vía `POST /api/estimates` y `PUT /api/estimates/:id` desde el botón “Guardar”.
- Eliminación manual se mantiene vía `DELETE /api/estimates/:id`.

## Índice local (último acceso)
Se agrega un índice local para ordenar por “último acceso”, persistido en `localStorage`.

- Key: `lve.recentEstimates.v1`
- Tipo: `Array<{ id: string; lastAccessed: number }>`
- Semántica:
  - `lastAccessed` se actualiza al cargar un proyecto desde “Presupuestos Recientes” o al restaurar el proyecto activo desde `lve.currentEstimateId`.
  - La lista se mantiene sin duplicados por `id` y con tamaño máximo (50 entradas).

## Estado (filtro)
El estado mostrado se deriva sin cambiar el modelo:

- `Calculado`: `grandTotal > 0`
- `Borrador`: `grandTotal === 0`

## Scroll del listado
Para evitar desbordamientos y mantener una lectura consistente:

- El contenedor del listado usa altura máxima `min(56vh, 28rem)` para mantener ~5 fichas visibles en desktop, sin romper layouts en pantallas pequeñas.
- La barra de desplazamiento aparece solo cuando el contenido excede esa altura.
- El área de scroll es enfocables por teclado y permite navegación con rueda/touch y teclado.
- Se habilita `scroll-behavior: smooth` para desplazamiento fluido.

## Auto-guardado (draft)
Para que cada proyecto nuevo quede registrado:

- Al presionar “Nuevo”, se crea automáticamente un registro “draft” en BD (vía `POST /api/estimates`) y se asigna como activo.
- Si el usuario empieza a editar el formulario y el proyecto no tiene `estimateId` todavía, se crea automáticamente un “draft” en segundo plano.

El guardado manual permanece intacto: cuando el proyecto ya tiene `estimateId`, “Guardar” usa `PUT` y no genera duplicados.
