## Sistemas Especiales de Bajo Voltaje

---

## 1. Propósito del Documento

La información analizada servirá como **base funcional, técnica y financiera** para desarrollar una aplicación destinada a calcular de manera efectiva **paramétricos de sistemas especiales de bajo voltaje**.

El objetivo principal de la aplicación será **automatizar, estandarizar y validar** el cálculo de presupuestos para sistemas como:

- **CCTV**
- **Control de acceso**
- **Detección y alarma contra incendio**
- **Audio ambietal**
- **Intercomunicación**
- **Intrusión**
- Otros sistemas especiales de baja tensión

La herramienta deberá permitir generar presupuestos confiables a partir de cantidades, costos de material, mano de obra, indirectos, utilidad e IVA, reduciendo errores comunes en hojas de Excel como referencias rotas, duplicidad de códigos, diferencias de redondeo o fórmulas inconsistentes.

---

# 2. Contexto General del Análisis

Se revisaron documentos de catálogo y presupuesto relacionados con proyectos de sistemas especiales de bajo voltaje, principalmente:

1. **Remodelación UCIA — Saltillo**

   - Proyecto enfocado en sistemas especiales.
   - Contiene conceptos con cantidades, precios unitarios, importes, materiales, mano de obra, indirectos y utilidad.
   - Total identificado: **$249,492.49 MXN más IVA**.
2. **Corporativo Piso 8**

   - Catálogo general de obra con múltiples especialidades.
   - Incluye referencias a sistemas eléctricos, control de acceso, CCTV, voz y datos, automatización, alarmas y comunicaciones.
   - Sirve como referencia para estructurar una aplicación más amplia, capaz de manejar diferentes especialidades y sistemas.

---

# 3. Sistemas Considerados en la Base Paramétrica

La aplicación debe contemplar inicialmente los sistemas especiales identificados en los documentos, principalmente los siguientes:

## 3.1 Control de Acceso

Incluye conceptos como:

- Terminales biométricas o faciales.
- Licencias de software.
- Videoporteros.
- Chapas magnéticas.
- Botones de salida.
- Botones de emergencia.
- Fuentes reguladas con batería.
- Canalización.
- Cableado de comunicación.
- Puesta en marcha.
- Capacitación.
- Planos y documentación As Built.

Este sistema requiere considerar tanto **equipos electrónicos** como **infraestructura física de instalación**.

---

## 3.2 CCTV / Videovigilancia

Incluye conceptos como:

- Cámaras IP tipo domo.
- Cámaras fisheye 360°.
- Cámaras exteriores.
- Desinstalación de cámaras existentes.
- Plug RJ45.
- Cable UTP Cat6.
- Canalización conduit.
- Cajas, conectores, coples y accesorios.
- Puesta en marcha.
- Capacitación.
- Documentación As Built.

En este sistema es importante considerar parámetros técnicos como resolución, tipo de cámara, cumplimiento NDAA, ONVIF, protección IP/IK, almacenamiento, ancho de banda y cantidad de puntos.

---

## 3.3 Detección y Alarma Contra Incendio

Incluye conceptos como:

- Detectores de humo.
- Bocinas con estrobo.
- Reinstalación de dispositivos existentes.
- Desinstalación de dispositivos existentes.
- Cable FPLR.
- Canalización conduit.
- Cajas galvanizadas.
- Tubo flexible.
- Conectores.
- Puesta en marcha.
- Capacitación.
- Planos As Built.

Este sistema debe manejar criterios específicos de instalación, compatibilidad de equipos y cantidades asociadas a dispositivos por zona o área.

---

## 3.4 Otros Sistemas Especiales a Considerar

Aunque el análisis principal se concentra en CCTV, control de acceso y detección de incendios, la aplicación debe diseñarse de manera escalable para incluir:

- Voz y datos.
- Audio ambiental.
- Automatización.
- Intercomunicación.
- Intrusión.
- Nurse Call.
- Redes inalámbricas.
- Monitoreo.
- Integración con plataformas de seguridad.

---

# 4. Estructura General del Presupuesto

La estructura del presupuesto está organizada de forma jerárquica mediante códigos de catálogo.

Ejemplo:

```text
5 SERVICES
 └── 5.7 ELECTRONIC SAFETY AND SECURITY
      ├── 5.7.1 Access Control and Intrusion Detection
      ├── 5.7.3 Electronic Surveillance / CCTV
      └── 5.7.5 Detection and Alarm
```

Esta estructura permite organizar los conceptos por:

- Capítulo.
- Subcapítulo.
- Sistema.
- Concepto específico.
- Unidad de medición.
- Cantidad.
- Precio unitario.
- Importe.

Para la aplicación, esta organización debe convertirse en una estructura de datos clara, donde cada concepto pertenezca a un sistema y a una categoría dentro del presupuesto.

---

# 5. Lógica Principal de Cálculo

El análisis identificó una fórmula base consistente en los conceptos revisados.

Cada precio unitario se calcula a partir de:

1. **Costo de material**
2. **Costo de mano de obra**
3. **Indirecto**
4. **Utilidad**

La fórmula general es:

$$
PrecioUnitario = Material + ManoObra + Indirecto + Utilidad
$$

Donde:

$$
CostoDirecto = Material + ManoObra
$$

$$
Indirecto = CostoDirecto * PorcentajeIndirecto
$$

$$
Utilidad = (CostoDirecto + Indirecto) * PorcentajeUtilidad
$$

Por lo tanto:

$$
PrecioUnitario = (Material + ManoObra) * (1 + PorcentajeIndirecto) * (1 + PorcentajeUtilidad)
$$

En el caso analizado:

- **Indirecto:** 25%
- **Utilidad:** 13%

Entonces:

$$
PrecioUnitario = (Material + ManoObra) * 1.25 * 1.13
$$

O de forma simplificada:

$$
PrecioUnitario = (Material + ManoObra) * 1.4125
$$

---

# 6. Cálculo de Mano de Obra

La mano de obra se calcula con base en una cuadrilla compuesta por diferentes perfiles:

| Perfil   | Tarifa Base |
| -------- | ----------: |
| Técnico |     $950.00 |
| Oficial  |     $750.00 |
| Ayudante |     $500.00 |

La fórmula identificada es:

$$
ManoObra = (Tecnico * TarifaTecnico) + (Oficial * TarifaOficial) + (Ayudante * TarifaAyudante)
$$

Ejemplo:

Si un concepto requiere:

- Técnico: 0
- Oficial: 1
- Ayudante: 1

Entonces:

$$
ManoObra = (0 * 950) + (1 * 750) + (1 * 500)
$$

$$
ManoObra = 1,250
$$

La aplicación deberá permitir configurar estos valores, ya que pueden cambiar por ciudad, proveedor, año, complejidad o tipo de proyecto.

---

# 7. Cálculo del Importe

Una vez calculado el precio unitario, el importe se obtiene multiplicando por la cantidad:

$$
Importe = Cantidad * PrecioUnitario
$$

Ejemplo:

Si el precio unitario de una cámara es de $10,819.75 y la cantidad es 3:

$$
Importe = 3 * 10,819.75
$$

$$
Importe = 32,459.25
$$

La aplicación deberá calcular automáticamente:

- Precio unitario.
- Importe por concepto.
- Subtotal por sistema.
- Subtotal general.
- IVA.
- Total con IVA.

---

# 8. Totales Identificados en el Proyecto UCIA

El presupuesto analizado muestra los siguientes subtotales:

| Sistema                    |               Importe |
| -------------------------- | --------------------: |
| Control de Acceso          |            $79,707.38 |
| CCTV / Videovigilancia     |            $80,520.98 |
| Detección y Alarma        |            $89,264.14 |
| **Subtotal General** | **$249,492.49** |

La suma de subtotales es coherente con el total general, con una diferencia mínima de centavos atribuible al redondeo.

---

# 9. Elementos que Debe Considerar la Aplicación

## 9.1 Información General del Proyecto

La aplicación debe permitir capturar:

- Nombre del proyecto.
- Unidad o ubicación.
- Cliente.
- Fecha.
- Número de revisión.
- Responsable del presupuesto.
- Moneda.
- IVA aplicable.
- Porcentaje de indirecto.
- Porcentaje de utilidad.
- Observaciones generales.

---

## 9.2 Catálogo de Sistemas

Debe existir un catálogo maestro de sistemas, por ejemplo:

| Código | Sistema                         |
| ------- | ------------------------------- |
| CCTV    | Circuito Cerrado de Televisión |
| CA      | Control de Acceso               |
| DET     | Detección de Incendios         |
| VYD     | Voz y Datos                     |
| AA      | Audio Ambiental                 |
| AUT     | Automatización                 |
| INT     | Intercomunicación              |
| INTR    | Intrusión                      |

Esto permitirá clasificar los conceptos y generar reportes por especialidad.

---

## 9.3 Catálogo de Conceptos

Cada concepto debe contener como mínimo:

- Código.
- Descripción.
- Sistema.
- Frente o área.
- Unidad.
- Cantidad.
- Costo unitario de material.
- Mano de obra calculada.
- Costo directo.
- Indirecto.
- Utilidad.
- Precio unitario.
- Importe.
- Notas técnicas.
- Marca.
- Modelo.
- Proveedor.
- Estatus.

---

## 9.4 Catálogo de Materiales y Equipos

La aplicación debe contar con una base de materiales y equipos reutilizable.

Campos sugeridos:

- Nombre del equipo/material.
- Marca.
- Modelo.
- Categoría.
- Sistema asociado.
- Unidad de medida.
- Costo unitario.
- Proveedor.
- Fecha de actualización.
- Ficha técnica.
- Certificaciones.
- Observaciones.

Ejemplo:

```json
{
  "sistema": "CCTV",
  "categoria": "Cámara IP Domo",
  "marca": "VIVOTEK",
  "modelo": "FD9383-HTV",
  "unidad": "PZA",
  "costoMaterial": 7000,
  "certificaciones": ["NDAA", "ONVIF", "IP66", "IK10"]
}
```

---

## 9.5 Catálogo de Mano de Obra

Debe existir una configuración editable para tarifas de personal:

| Recurso  |  Tarifa |
| -------- | ------: |
| Técnico | $950.00 |
| Oficial  | $750.00 |
| Ayudante | $500.00 |

Además, se recomienda manejar plantillas de instalación por tipo de concepto.

Ejemplo:

| Tipo de Concepto           | Técnico | Oficial | Ayudante |
| -------------------------- | -------: | ------: | -------: |
| Cámara IP                 |      0.3 |     0.3 |      0.3 |
| Chapa magnética           |        0 |       1 |        1 |
| Plug RJ45                  |        0 |     0.1 |      0.1 |
| Tubería conduit por metro |        0 |    0.03 |     0.03 |
| Puesta en marcha           |      0.5 |     0.5 |      0.5 |

---

# 10. Parámetros Configurables del Motor de Cálculo

Para que la aplicación sea flexible, los siguientes valores no deben estar fijos en el código:

| Parámetro            | Valor Base Detectado | Configurable |
| --------------------- | -------------------: | ------------ |
| Indirecto             |                  25% | Sí          |
| Utilidad              |                  13% | Sí          |
| IVA                   |                  16% | Sí          |
| Tarifa técnico       |              $950.00 | Sí          |
| Tarifa oficial        |              $750.00 | Sí          |
| Tarifa ayudante       |              $500.00 | Sí          |
| Moneda                |                  MXN | Sí          |
| Política de redondeo |          2 decimales | Sí          |

---

# 11. Problemas Detectados en el Excel que Debe Evitar la Aplicación

## 11.1 Errores de Referencia

Se detectaron errores tipo:

```text
#REF!
```

Estos errores indican fórmulas rotas o referencias eliminadas dentro del Excel.

La aplicación debe evitar depender de fórmulas de hoja de cálculo y utilizar un motor de cálculo propio, validado y auditable.

---

## 11.2 Códigos Duplicados

Se detectó duplicidad de código en conceptos diferentes, específicamente:

```text
5.7.5.9
```

Esto puede afectar la trazabilidad del presupuesto.

La aplicación debe validar que no existan códigos duplicados o, en su defecto, manejar un identificador interno único.

---

## 11.3 Unidades No Normalizadas

Se encontraron variantes como:

```text
m.l.
ml
mts.
pza.
```

La aplicación debe normalizar las unidades para evitar inconsistencias.

Ejemplo:

| Unidad Original | Unidad Normalizada |
| --------------- | ------------------ |
| m.l.            | ML                 |
| ml              | ML                 |
| mts.            | ML                 |
| pza.            | PZA                |

---

## 11.4 Diferencias por Redondeo

Las diferencias de centavos son normales cuando se redondean precios unitarios, indirectos o utilidades en diferentes etapas.

La aplicación debe establecer una política clara:

- Calcular internamente con mayor precisión.
- Mostrar valores con dos decimales.
- Definir si el importe se calcula con precio unitario redondeado o no redondeado.

---

# 12. Validaciones Obligatorias de la Aplicación

La aplicación debe validar como mínimo:

- Cantidad mayor o igual a cero.
- Costo de material no negativo.
- Mano de obra no negativa.
- Sistema obligatorio.
- Unidad válida.
- Código único.
- Porcentaje de indirecto válido.
- Porcentaje de utilidad válido.
- IVA válido.
- Descripción obligatoria.
- Cálculo correcto de precio unitario.
- Cálculo correcto de importe.
- Que no existan conceptos activos con errores.

---

# 13. Alertas Recomendadas

| Situación                             | Alerta sugerida                                                            |
| -------------------------------------- | -------------------------------------------------------------------------- |
| Código duplicado                      | “El código del concepto ya existe.”                                     |
| Cantidad cero con costo definido       | “El concepto tiene costo, pero la cantidad es cero.”                     |
| Material en cero para suministro       | “Revise el costo de material; este concepto parece requerir suministro.” |
| Mano de obra en cero para instalación | “Revise la mano de obra; este concepto incluye instalación.”            |
| Unidad no reconocida                   | “Unidad pendiente de normalización.”                                    |
| Fórmula inválida                     | “No se pudo calcular el precio unitario.”                                |
| Sistema vacío                         | “Debe seleccionar un sistema.”                                           |
| Importe distinto al esperado           | “Existe una diferencia entre el importe calculado y el registrado.”      |

---

# 14. Módulos Recomendados para la Aplicación

## 14.1 Módulo de Proyectos

Permite crear y administrar proyectos.

Debe incluir:

- Datos generales.
- Unidad.
- Cliente.
- Fechas.
- Revisión.
- Parámetros financieros.
- Configuración de IVA, indirecto y utilidad.

---

## 14.2 Módulo de Catálogo Maestro

Debe almacenar conceptos base reutilizables.

Incluye:

- Equipos.
- Materiales.
- Accesorios.
- Canalizaciones.
- Cableados.
- Servicios.
- Puesta en marcha.
- Capacitación.
- Documentación.

---

## 14.3 Módulo de Sistemas Especiales

Permite organizar los conceptos por sistema:

- CCTV.
- Control de acceso.
- Detección de incendios.
- Voz y datos.
- Audio.
- Automatización.
- Intrusión.

---

## 14.4 Módulo de Cuadrillas y Mano de Obra

Debe permitir:

- Crear perfiles de mano de obra.
- Configurar tarifas.
- Definir rendimientos.
- Crear plantillas por tipo de instalación.
- Calcular automáticamente la mano de obra por concepto.

---

## 14.5 Módulo de Presupuesto

Debe permitir:

- Agregar conceptos.
- Editar cantidades.
- Seleccionar materiales.
- Calcular precios unitarios.
- Calcular importes.
- Agrupar por sistema.
- Generar subtotales.
- Aplicar IVA.
- Obtener total general.

---

## 14.6 Módulo de Reportes

Debe generar:

- Presupuesto detallado.
- Resumen por sistema.
- Resumen de materiales.
- Resumen de mano de obra.
- Resumen financiero.
- Comparativo entre revisiones.
- Exportación a PDF.
- Exportación a Excel.

---

## 14.7 Módulo de Auditoría

Recomendado para trazabilidad.

Debe registrar:

- Usuario que creó el presupuesto.
- Usuario que modificó conceptos.
- Fecha de modificación.
- Cambios en costos.
- Cambios en cantidades.
- Cambios en porcentajes.
- Revisión del presupuesto.

---

# 15. Modelo de Datos Base Recomendado

## 15.1 Proyecto

```ts
type Project = {
  id: string;
  name: string;
  unit: string;
  client: string;
  date: string;
  revision: string;
  currency: "MXN" | "USD";
  indirectRate: number;
  profitRate: number;
  ivaRate: number;
};
```

---

## 15.2 Concepto

```ts
type CatalogItem = {
  id: string;
  code: string;
  description: string;
  system: string;
  unit: string;
  quantity: number;
  materialUnitCost: number;
  technicianQty: number;
  officerQty: number;
  helperQty: number;
};
```

---

## 15.3 Resultado de Cálculo

```ts
type CalculationResult = {
  laborUnitCost: number;
  directUnitCost: number;
  indirectUnitCost: number;
  profitUnitCost: number;
  unitPrice: number;
  totalMaterial: number;
  totalLabor: number;
  totalDirect: number;
  totalIndirect: number;
  totalProfit: number;
  totalAmount: number;
};
```

---

# 16. Motor de Cálculo Recomendado

La lógica central de la aplicación puede representarse así:

```ts
function calculateItem(item: CatalogItem, project: Project) {
  const laborUnitCost =
    item.technicianQty * 950 +
    item.officerQty * 750 +
    item.helperQty * 500;

  const directUnitCost =
    item.materialUnitCost + laborUnitCost;

  const indirectUnitCost =
    directUnitCost * project.indirectRate;

  const profitUnitCost =
    (directUnitCost + indirectUnitCost) * project.profitRate;

  const unitPrice =
    directUnitCost + indirectUnitCost + profitUnitCost;

  const totalAmount =
    unitPrice * item.quantity;

  const iva =
    totalAmount * project.ivaRate;

  const totalWithIva =
    totalAmount + iva;

  return {
    laborUnitCost,
    directUnitCost,
    indirectUnitCost,
    profitUnitCost,
    unitPrice,
    totalAmount,
    iva,
    totalWithIva,
  };
}
```

En una versión más robusta, las tarifas de técnico, oficial y ayudante deben obtenerse desde una tabla configurable, no estar fijas dentro de la función.

---

# 17. Reportes Clave que Debe Generar

## 17.1 Presupuesto Detallado

Debe mostrar:

- Código.
- Concepto.
- Sistema.
- Unidad.
- Cantidad.
- Precio unitario.
- Importe.

---

## 17.2 Análisis de Precio Unitario

Debe mostrar:

- Material.
- Mano de obra.
- Costo directo.
- Indirecto.
- Utilidad.
- Precio unitario.

---

## 17.3 Resumen por Sistema

Ejemplo:

| Sistema                 |               Importe |
| ----------------------- | --------------------: |
| Control de Acceso       |            $79,707.38 |
| CCTV                    |            $80,520.98 |
| Detección de Incendios |            $89,264.14 |
| **Total**         | **$249,492.49** |

---

## 17.4 Resumen de Materiales

Debe mostrar:

- Material o equipo.
- Marca.
- Modelo.
- Cantidad total.
- Unidad.
- Costo unitario.
- Costo total.

---

## 17.5 Resumen de Mano de Obra

Debe mostrar:

- Recurso.
- Cantidad equivalente.
- Tarifa.
- Costo total.

---

## 17.6 Comparativo entre Revisiones

Debe permitir comparar:

- Revisión anterior vs revisión actual.
- Cambios en cantidades.
- Cambios en precios unitarios.
- Cambios en importes.
- Variación porcentual.

---

# 18. Recomendaciones Técnicas para el Desarrollo

## 18.1 Separar Datos, Cálculo y Presentación

La aplicación debe separar claramente:

- Base de datos.
- Motor de cálculo.
- Interfaz de usuario.
- Exportación de reportes.

Esto evitará errores como los encontrados en Excel.

---

## 18.2 Usar Identificadores Únicos

Cada concepto debe tener un identificador interno único, independiente del código de catálogo.

Ejemplo:

```text
id interno: UUID
codigo visible: 5.7.5.9
```

---

## 18.3 Mantener Historial de Costos

Los costos de materiales y mano de obra cambian con el tiempo, por lo que debe existir historial de precios.

Campos sugeridos:

- Costo anterior.
- Costo nuevo.
- Fecha de actualización.
- Usuario que modificó.
- Proveedor.
- Observaciones.

---

## 18.4 Permitir Plantillas por Tipo de Proyecto

La aplicación debe permitir crear plantillas para:

- Hospitales.
- Corporativos.
- Sucursales.
- Oficinas.
- Estacionamientos.
- Áreas críticas.
- Centros de monitoreo.

---

## 18.5 Importación desde Excel

Debido a que la información actual proviene de Excel, la aplicación debería permitir importar catálogos existentes.

Durante la importación debe validar:

- Códigos duplicados.
- Campos vacíos.
- Unidades no reconocidas.
- Valores negativos.
- Errores tipo `#REF!`.
- Subtotales inconsistentes.
- Conceptos sin sistema asignado.

---

# 19. Base Funcional Mínima Recomendada — MVP

Para una primera versión de la aplicación, se recomienda incluir:

1. **Alta de proyecto**
2. **Configuración de indirecto, utilidad e IVA**
3. **Catálogo de sistemas**
4. **Catálogo de conceptos**
5. **Captura de cantidades**
6. **Cálculo automático de precio unitario**
7. **Cálculo de importes**
8. **Resumen por sistema**
9. **Exportación a Excel o PDF**
10. **Validación de errores básicos**

Con esto se puede cubrir la necesidad principal: calcular presupuestos paramétricos de forma rápida, ordenada y confiable.

---

# 20. Conclusión General

La información analizada proporciona una base sólida para desarrollar una aplicación de cálculo paramétrico para **sistemas especiales de bajo voltaje**.

La lógica de cálculo identificada es clara y reutilizable:

$$
CostoDirecto = Material + ManoObra
$$

$$
Indirecto = CostoDirecto * 25\%
$$

$$
Utilidad = (CostoDirecto + Indirecto) * 13\%
$$

$$
PrecioUnitario = CostoDirecto + Indirecto + Utilidad
$$

$$
Importe = Cantidad * PrecioUnitario
$$

La futura aplicación debe transformar esta lógica de Excel en un sistema más confiable, escalable y auditable, capaz de manejar catálogos, conceptos, materiales, mano de obra, sistemas, revisiones y reportes.

El beneficio principal será contar con una herramienta que permita:

- Reducir errores de cálculo.
- Estandarizar presupuestos.
- Agilizar análisis paramétricos.
- Comparar proyectos.
- Actualizar costos fácilmente.
- Generar reportes profesionales.
- Facilitar la toma de decisiones técnicas y financieras.

En resumen, el sistema propuesto debe funcionar como una **plataforma integral de presupuestación paramétrica para sistemas especiales de bajo voltaje**, tomando como punto de partida los criterios, fórmulas y estructura detectados en los documentos analizados.
