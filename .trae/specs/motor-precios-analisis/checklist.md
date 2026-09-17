# Checklist: Análisis y Mejora del Motor de Precios

## Diagnóstico
- [x] Análisis comparativo realizado (brecha vs UPAEP identificada)
- [x] Diferencias cuantificadas con impacto en % del total
- [x] Lista de componentes faltantes identificada

## Modelo de Datos
- [x] `CctvConfig` expandido en `estimate-store.ts` (auto-dimensionamiento + servicios)
- [x] Nuevos `deviceType` agregados a `constants.ts`
- [x] Tipos TypeScript necesarios definidos

## Motor de Cálculo
- [x] `calculateCCTV()` auto-dimensiona switches correctamente (48/24 PoE)
- [x] `calculateCCTV()` procesa UPS/PDU/rack/monitor correctamente
- [x] `calculateCCTV()` dimensiona patch panels/patch cords/jacks/faceplates/insertos correctamente
- [x] Servicios (certificación, etiquetado, as-built, instalación) calculados correctamente
- [x] Cálculo de cable UTP por bobina funciona
- [x] Canalización soporta modo ML y LOTE
- [x] Fórmula de costos indirectos y utilidad sin cambios (12% y 15%)

## Catálogo de Precios
- [x] Switches UniFi agregados al catálogo
- [x] UPS agregados al catálogo
- [x] Rack y organizadores agregados al catálogo
- [x] Monitores Samsung agregados al catálogo
- [x] PDU, Patch Panel y Patch Cord agregados al catálogo
- [x] Jacks/faceplates/insertos/velcro agregados al catálogo
- [x] Servicios (certificación, etiquetado, as-built, instalación) y lotes (canalización/misceláneos) agregados/ajustados
- [x] Precios de VIVOTEK FD9383-HV actualizados
- [x] Precios de VIVOTEK NR9682-V3 actualizados
- [x] Precios de WD Purple PRO 10TB actualizados
- [x] Precio de bobina cable UTP Cat6 actualizado

## UI de Configuración
- [x] Sección de auto-dimensionamiento (BOM) visible en `cctv-form.tsx`
- [x] Configuración de canalización (ML/LOTE) visible y funcional
- [x] Sección de servicios visible y funcional (incluye modo por cámara/lote)

## Validación
- [x] Test automatizado valida UPAEP CCTV 45 cámaras (SKUs reales)
- [x] Meta: totalWithIva del estimador >= +20% vs total proveedor (con IVA)
- [x] Sin errores de TypeScript (tests OK)
