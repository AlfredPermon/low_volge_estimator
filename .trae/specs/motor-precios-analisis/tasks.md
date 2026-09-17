# Tareas: Análisis y Mejora del Motor de Precios

## 1. Diagnóstico Inicial
- [x] Analizar diferencias entre presupuesto estimado y propuesta real UPAEP
  - Identificar componentes faltantes (switches, UPS, rack, monitores)
  - Cuantificar impacto de cada diferencia en el total
  - Documentar precios unitarios incorrectos en catálogo

## 2. Expandir Modelo de Datos CCTV

- [x] Expandir `CctvConfig` en `estimate-store.ts` para soportar auto-dimensionamiento (BOM) y servicios detallados

- [x] Agregar nuevos `deviceType` a `constants.ts` para componentes de red, rack, cableado estructurado, servicios y lotes:
  - `network_switch`
  - `ups`
  - `rack`
  - `cable_management_horizontal`
  - `cable_management_vertical`
  - `monitor`
  - `pdu`
  - `patch_panel`
  - `patch_cord`
  - `network_jack`
  - `faceplate`
  - `blank_insert`
  - `cable_utp_spool`
  - `service_certification`
  - `service_labeling`
  - `service_as_built`
  - `service_install_cabling`
  - `service_install_cctv`
  - `miscellaneous`
  - `conduit_lot`

## 3. Actualizar Motor de Cálculo (`calculator.ts`)

- [x] Extender `calculateCCTV()` para auto-dimensionar BOM por cantidad de cámaras (switches/patch panels/patch cords/jacks/faceplates/rack/UPS/PDU/monitor)
- [x] Agregar cálculo de servicios (test certificación, etiquetado, as-built, instalación y misceláneos)
- [x] Modificar cálculo de cable UTP para soporte por bobina (305m)
- [x] Ajustar cálculo de conduit para soportar partidas por ML y por LOTE

## 4. Crear/Actualizar Catálogo de Precios

- [x] Crear/actualizar seed para nuevos componentes de red y cableado estructurado:
  - UniFi Switch USW-PRO-48-POE Gen2
  - UniFi Switch USW-PRO-24-POE Gen2
  - UPS 2000VA On-Line
  - Rack 2 postes 45U
  - Organizador vertical NetRunner
  - Samsung Crystal Signage 55"
  - PDU 127VAC 15A
  - Patch Panel 48 puertos
  - Patch cord Cat6 7ft
  - Jack RJ45, faceplate e inserto ciego
  - Organizadores (horizontal/vertical) y velcro
  - Servicios (certificación, etiquetado, as-built, instalación) y lotes (canalización/misceláneos)

- [x] Actualizar/agregar SKUs de componentes para caso UPAEP:
  - VIVOTEK FD9383-HV → $7,480.00
  - VIVOTEK NR9682-V3 → $174,024.00
  - WD Purple PRO 10TB → $8,888.80
  - Cable UTP bobina 305m → $6,748.09

## 5. Actualizar UI de Configuración CCTV (`cctv-form.tsx`)

- [x] Agregar sección de auto-dimensionamiento (BOM) y canalización (ML/LOTE)

- [x] Agregar sección de servicios (habilitar/deshabilitar y modo por cámara/lote)

## 6. Validación con Datos Reales

- [x] Comparar resultado calculado vs propuesta UPAEP
- [x] Meta: total del estimador (con IVA) >= +20% vs total proveedor (con IVA)

## Dependencias
- Tarea 3 depende de Tarea 2
- Tarea 5 depende de Tarea 2 y 3
- Tarea 6 depende de Tareas 1, 2, 3, 4, 5
