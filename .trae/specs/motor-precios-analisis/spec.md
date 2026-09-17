# Análisis y Mejora del Motor de Precios - Spec

## Why

El usuario ha comparado un presupuesto generado por **Low-Voltage Estimator** ($2,376,512.32 con IVA) contra una propuesta real de un proveedor ($1,393,109.05 con IVA) para un proyecto CCTV de 45 cámaras en UPAEP. La diferencia del **70%** indica problemas estructurales en el motor de cálculo y en la cobertura de componentes del sistema. La meta es que el estimador genere un BOM realista y un total con IVA coherente, manteniendo un margen objetivo de **≥ +20%** sobre un proveedor real (sin necesidad de igualar precios).

## What Changes

### 1. Diagnóstico de Diferencias Identificadas

**Componentes faltantes en el modelo de CCTV:**
- Switches de red (UniFi Pro 48 PoE, UniFi Pro 24 PoE)
- UPS (2000VA / 1800W)
- Rack abierto de 2 postes
- Organizadores verticales de cables
- Pantalla comercial Samsung 55" (monitoreo)
- PDU de rack

**Partidas/servicios no modelados:**
- Canalización por tubería (lote)
- Misceláneos y accesorios (lote)
- Test de certificación (por cámara)
- Identificación y etiquetado (por cámara)
- Planos As-Built y memoria técnica
- Instalación y configuración de equipos
- Patch panels
- Patch cords

**Discrepancias en precios unitarios:**
| Componente | Estimador | Propuesta Real |
|------------|-----------|---------------|
| Cámara VIVOTEK FD9383-HV | $9,469.10 | $7,480.00 |
| NVR VIVOTEK NR9682-V3 | $221,909.12 | $174,024.00 |
| Disco WD 10TB Purple PRO | $9,244.81 (×16) | $8,888.80 (×12) |
| Cable UTP Cat6 (metro) | $49.59 | ~$22.12 (por bobina de 305m) |

**Cálculo de cable incorrecto:**
- Estimador: 2,740.5 m × $49.59 = $135,901.40
- Propuesta real: 12 bobinas × $6,748.09 = $80,977.04 (3,660 m totales)
- El estimador calcula más metros pero a un precio unitario mayor por metro

### 2. Problemas Estructurales en `calculator.ts`

**a) Falta de componentes de red en `CctvConfig`:**
```typescript
// Estado actual:
interface CctvConfig {
  cameras: CameraEntry[];
  nvr: { qty, bays, storageTB, disksPerBay, nvrModel };
  avgDistanceMeters: number;
  licenses: number;
}

// Debe expandirse para incluir:
- switches: NetworkSwitch[]
- ups: UPSConfig
- rack: RackConfig
- monitors: MonitorConfig[]
```

**b) Fórmula de cálculo de canalización simplificada:**
La fórmula actual solo considera conduit, pero la propuesta real incluye canalización por tubería de 1 1/4", 1", 3/4" y canaleta plástica como una partida de lote.

**c) Servicios misceláneos no modelados:**
No hay forma de agregar: test de certificación, etiquetado, planos as-built, etc.

### 3. Elementos de Red Recomendados para Agregar al Catálogo

| SKU | Descripción | Sistema | deviceType | Precio Estimado |
|-----|-------------|---------|------------|----------------|
| USW-PRO-48-POE | UniFi Switch Pro 48 PoE | GENERAL | network_switch | $28,250.00 |
| USW-PRO-24-POE | UniFi Switch Pro 24 PoE | GENERAL | network_switch | $18,937.50 |
| Samsung-QBC-55 | Samsung Crystal Signage 55" | GENERAL | monitor | $19,514.40 |
| UPS-2000VA | UPS 2000VA On-Line | GENERAL | ups | $15,895.50 |
| Rack-2P-45U | Rack 2 postes 45U | GENERAL | rack | $6,800.00 |
| VRT-ORG-1 | Organizador vertical NetRunner | GENERAL | cable_management | $7,200.00 |
| PDU-15A | PDU 127VAC 15A 12 pos | GENERAL | pdu | $1,552.75 |
| PATCH-PANEL-48 | Patch Panel 48 puertos | CABLEADO | patch_panel | $12,999.17 |
| PATCH-CORD-7 | Patch cord Cat6 7ft | CABLEADO | patch_cord | $322.32 |

## Impact

- Affected specs: Sistema de CCTV, Cálculo de presupuesto, Catálogo de precios
- Affected code: `calculator.ts`, `cctv-form.tsx`, `estimate-store.ts`, `constants.ts`

## ADDED Requirements

### Requirement: Modelo Extendido de Configuración CCTV
El sistema DEBERÁ permitir configurar componentes de red como switches, UPS, racks y monitores dentro de la configuración CCTV.

#### Scenario: Configurar switches para proyecto de 45 cámaras
- **WHEN** usuario configura un proyecto CCTV con 45 cámaras
- **THEN** el sistema DEBERÁ permitir agregar switches UniFi Pro 48 PoE y UniFi Pro 24 PoE con cantidad y modelo

### Requirement: Partidas de Servicios para CCTV
El sistema DEBERÁ incluir partidas configurables para:
- Test de certificación (por unidad o lote)
- Identificación y etiquetado (por unidad o lote)
- Planos As-Built y memoria técnica
- Instalación y configuración de equipos

#### Scenario: Agregar servicios al presupuesto
- **WHEN** usuario habilita servicios de testeo y certificación
- **THEN** el sistema DEBERÁ calcular 45 tests × $150.00 = $6,750.00

### Requirement: Cálculo de Cable por Bobina
El sistema DEBERÁ permitir que el cable UTP se calcule por bobina (305m) en lugar de por metro, aplicando el precio de bobina y calculando automáticamente la cantidad de bobinas necesarias.

#### Scenario: Cálculo de cable para 3,660m
- **WHEN** distancia total calculada es 3,660m y se usa precio de bobina $6,748.09 (305m)
- **THEN** el sistema DEBERÁ calcular 12 bobinas × $6,748.09 = $80,977.04

### Requirement: Validación de Margen vs Proveedor (UPAEP)
El sistema DEBERÁ permitir validar que el total calculado (con IVA) mantiene un margen de **≥ +20%** respecto a una propuesta real de referencia para el caso UPAEP CCTV 45 cámaras.

#### Scenario: Caso UPAEP 45 cámaras
- **WHEN** se calcula el presupuesto con SKUs FD9383-HV, NR9682-V3 y WD102PURP y servicios detallados habilitados
- **THEN** `totalWithIva` DEBERÁ ser ≥ `1.2 × 1,393,109.05`

## MODIFIED Requirements

### Requirement: Fórmula de Cálculo de Canalización
La fórmula de canalización DEBERÁ soportar tanto cálculo por metro lineal como partidas de lote para canalización por tubería.

**Current**: `L_canal = Dist × Qty × (1 + F_canal)`
**Modified**: El sistema DEBERÁ permitir configurar canalización como:
- Metro lineal (fórmula actual con desperdicio)
- Lote con precio fijo

### Requirement: Factor de Desperdicio de Cable
El factor de desperdicio de cable DEBERÁ aplicarse correctamente para calcular metros totales, pero el precio unitario DEBERÁ ser por bobina de 305m.

#### Scenario: Cable con desperdicio 10%
- **WHEN** se requieren 3,327m de cable y factor desperdicio 10%
- **THEN** metros totales = 3,327 × 1.10 = 3,660m → 12 bobinas de 305m

## REMOVED Requirements

N/A

## Análisis Detallado de Componentes Faltantes

### A. Componentes de Red (Switches, UPS, Rack)

**Modelo de datos propuesto:**
```typescript
interface NetworkSwitch {
  model: string; // SKU del switch
  qty: number;
  ports: number;
  poe: boolean;
}

interface UpsConfig {
  model: string;
  qty: number;
  va: number;
}

interface RackConfig {
  model: string;
  qty: number;
  units: number;
}

interface MonitorConfig {
  model: string;
  qty: number;
  size: number;
}

interface CctvConfigExtended extends CctvConfig {
  switches: NetworkSwitch[];
  ups: UpsConfig[];
  racks: RackConfig[];
  monitors: MonitorConfig[];
}
```

### B. Servicios Adicionales

```typescript
interface CctvServices {
  certificationTests: { qty: number; unitCost: number };
  identification: { qty: number; unitCost: number };
  asBuiltPlans: { qty: number; unitCost: number };
  installation: { qty: number; unitCost: number };
}
```

### C. Nuevo Catálogo de deviceTypes Necesario

```typescript
// Agregar a DEVICE_TYPES:
'network_switch'
'network_router'
'ups'
'rack'
'rack_organizer'
'monitor'
'pdu'
'patch_panel'
'patch_cord'
```

## Plan de Implementación Sugerido

1. **Fase 1**: Expandir `CctvConfig` y `calculator.ts` para soportar switches, UPS, racks
2. **Fase 2**: Agregar servicios misceláneos (test, certificación, etiquetado)
3. **Fase 3**: Ajustar cálculo de cable para soporte por bobina
4. **Fase 4**: Crear/actualizar precios en catálogo
5. **Fase 5**: Validar con datos reales UPAEP
