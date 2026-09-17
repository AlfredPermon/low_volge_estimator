# Presupuestos Recientes — Informe de pruebas

## Alcance
Validación de compatibilidad del módulo de listado “Presupuestos Recientes” dentro de la pestaña “Configuración”.

## Pruebas automatizadas
- Unit tests de normalización y mantenimiento del índice local de “último acceso”.
  - Archivo: `tests/recent-estimates.test.ts`
  - Ejecutable con: `npm test`

## Pruebas funcionales (manuales)
Checklist recomendado:

- Listado base
  - El listado sigue cargando desde la misma fuente de datos (`/api/estimates`).
  - La lista muestra registros existentes sin requerir acciones nuevas del usuario.

- Acceso / reordenamiento
  - Al abrir un presupuesto desde el listado, este sube a la primera posición por “Accedido”.
  - Al recargar la app, el orden por último acceso se conserva.

- Filtros
  - Buscar por nombre / cliente / proyecto reduce resultados.
  - Filtro por estado:
    - `Calculado` muestra presupuestos con `grandTotal > 0`.
    - `Borrador` muestra presupuestos con `grandTotal = 0`.
  - Filtro por ventana temporal (7/30/90 días) se aplica sobre el “último acceso” (o `updatedAt` si nunca se accedió).

- Scroll / responsive / accesibilidad
  - Con 1–5 fichas el contenedor no muestra barra (no hay overflow).
  - Con >5 fichas aparece la barra y permite scroll sin “saltos” visuales.
  - El scroll funciona con rueda/touch y teclado (tab → foco en el área → scroll).
  - En pantallas pequeñas no hay desbordamiento horizontal; las fichas permanecen truncadas donde corresponde.

- Guardado manual (compatibilidad)
  - El botón “Guardar” continúa funcionando y no crea duplicados.
  - Editar datos del wizard y guardar persiste cambios como antes.

- Eliminación (compatibilidad)
  - El botón de eliminar elimina el registro en BD.
  - El elemento desaparece del listado y del índice local de “último acceso”.
