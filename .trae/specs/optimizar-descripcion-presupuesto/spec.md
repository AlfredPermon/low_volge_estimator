# Optimización de Columna "Descripción" en Presupuesto Spec

## Why
La tabla del módulo **Presupuesto** muestra textos de descripción muy extensos que hoy expanden la celda y provocan desbordamiento horizontal, afectando legibilidad y usabilidad. Se requiere una visualización coherente sin scroll horizontal y un mecanismo accesible para consultar el texto completo bajo demanda.

## What Changes
- Estandarizar el ancho de la columna **Descripción** para que la tabla se visualice completa dentro del espacio disponible, evitando desbordamiento horizontal.
- Truncar por defecto el contenido largo en **Descripción** con puntos suspensivos.
- Mostrar el texto completo bajo interacción (hover, foco por teclado o clic) mediante un elemento emergente temporal (tooltip) que se oculte automáticamente al perder interacción.
- Mantener comportamiento responsivo y accesible (navegación por teclado y foco visible).

## Impact
- Affected specs: UI de tabla, accesibilidad, responsividad.
- Affected code:
  - [budget-view.tsx](file:///C:/low_voltage_estimator/src/components/estimator/budget-view.tsx)
  - [table.tsx](file:///C:/low_voltage_estimator/src/components/ui/table.tsx) (solo si es necesario para eliminar wrappers redundantes o permitir layout fijo sin overflow)
  - [tooltip.tsx](file:///C:/low_voltage_estimator/src/components/ui/tooltip.tsx) (reuso)

## ADDED Requirements
### Requirement: Ancho Estandarizado de "Descripción"
La tabla de Presupuesto SHALL asegurar que todas las columnas se visualicen simultáneamente sin obligar al usuario a realizar desplazamiento horizontal, en condiciones normales de escritorio (ancho típico de la vista).

#### Scenario: Tabla sin overflow horizontal
- **WHEN** el usuario abre la pestaña **Presupuesto**
- **THEN** la tabla SHALL ajustar el layout para que las columnas (Partida, Código, Descripción, Unidad, Cantidad, P.U., Importe, APU) sean visibles dentro del contenedor sin desbordamiento horizontal
- **AND** la columna **Descripción** SHALL mantener una proporción visual equilibrada respecto al resto de columnas

### Requirement: Truncado con Indicador Visual
El contenido de la columna **Descripción** SHALL mostrarse truncado cuando exceda el ancho asignado, usando puntos suspensivos para indicar texto incompleto.

#### Scenario: Texto largo truncado
- **WHEN** una celda de **Descripción** contiene un texto largo
- **THEN** la celda SHALL renderizarse en una sola línea truncada con `…`
- **AND** la tabla SHALL mantener su ancho sin ser expandida por la longitud del texto

### Requirement: Texto Completo Bajo Demanda (Tooltip Accesible)
El sistema SHALL mostrar el texto completo de **Descripción** únicamente mientras el usuario interactúa con la celda (hover, foco o clic), y SHALL ocultarlo automáticamente al perder interacción.

#### Scenario: Hover
- **WHEN** el usuario coloca el cursor sobre una celda truncada de **Descripción**
- **THEN** el sistema SHALL mostrar un tooltip con el texto completo
- **AND** el tooltip SHALL ocultarse al retirar el cursor

#### Scenario: Teclado (accesibilidad)
- **WHEN** el usuario navega con Tab hasta una celda truncada de **Descripción**
- **THEN** el sistema SHALL mostrar el tooltip con el texto completo en foco
- **AND** el tooltip SHALL ocultarse al perder el foco (Shift+Tab o Tab)

#### Scenario: Clic
- **WHEN** el usuario hace clic en una celda truncada de **Descripción**
- **THEN** el sistema SHALL activar el foco del elemento de la celda y mostrar el tooltip
- **AND** el tooltip SHALL ocultarse al hacer clic fuera o al perder foco

## MODIFIED Requirements
### Requirement: Render de Filas en Presupuesto
El render de la celda `item.description` en Presupuesto SHALL usar truncado y un trigger accesible para tooltip, sin cambiar el contenido original del dataset ni la lógica de cálculo.

## REMOVED Requirements
N/A

