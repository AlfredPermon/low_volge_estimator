import { z } from 'zod';

export type EmergencyExitType =
  | 'DIRECT_EXTERIOR'
  | 'STAIRWAY'
  | 'CORRIDOR_DOOR'
  | 'SAFE_ZONE_POINT';

export type NOM026SignCategory =
  | 'SALIDA_DE_EMERGENCIA'
  | 'RUTA_DE_EVACUACION'
  | 'ESCALERA_DE_EMERGENCIA'
  | 'ZONA_DE_SEGURIDAD'
  | 'PRIMEROS_AUXILIOS';

export type ArrowDirection =
  | 'RIGHT'
  | 'LEFT'
  | 'UP'
  | 'DOWN'
  | 'UP_RIGHT'
  | 'UP_LEFT'
  | 'DOWN_RIGHT'
  | 'DOWN_LEFT';

export type SignMaterial =
  | 'ACRILICO_FOTOLUMINISCENTE'
  | 'VINILO_ADHERIBLE'
  | 'ALUMINIO_FOTOLUMINISCENTE'
  | 'ESTRUCTURA_BANDERA';

export type SignMountingType =
  | 'ADHERIDO_PARED'
  | 'SOBRE_PUERTA'
  | 'TIPO_BANDERA'
  | 'COLGANTE_TECHO';

export interface EmergencySignDevice {
  id: string;
  x: number;
  y: number;
  planoId: string;
  category: NOM026SignCategory;
  subType: string;
  exitType?: EmergencyExitType;
  arrowDirection?: ArrowDirection;
  arrowAngle?: number;
  viewingDistanceM: number; // Distancia máxima L en metros (5, 10, 15, 20, 30)
  surfaceAreaM2: number; // S >= L^2 / 2000
  widthM: number; // Ancho calculado en metros
  heightM: number; // Alto calculado en metros
  mountingHeightM: number; // Altura de instalación desde piso (2.20m por defecto)
  distFromCeilingM: number; // Mínimo 0.30m desde el techo
  illuminationLux: number; // Mínimo 50 luxes
  isPhotoluminescent: boolean;
  material: SignMaterial;
  mountingType: SignMountingType;
  isValidLocation: boolean;
  validationAlerts: string[];
  associatedRouteId?: string;
  unitCostMxn?: number;
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

export const EmergencyExitTypeSchema = z.enum([
  'DIRECT_EXTERIOR',
  'STAIRWAY',
  'CORRIDOR_DOOR',
  'SAFE_ZONE_POINT',
]);

export const NOM026SignCategorySchema = z.enum([
  'SALIDA_DE_EMERGENCIA',
  'RUTA_DE_EVACUACION',
  'ESCALERA_DE_EMERGENCIA',
  'ZONA_DE_SEGURIDAD',
  'PRIMEROS_AUXILIOS',
]);

export const ArrowDirectionSchema = z.enum([
  'RIGHT',
  'LEFT',
  'UP',
  'DOWN',
  'UP_RIGHT',
  'UP_LEFT',
  'DOWN_RIGHT',
  'DOWN_LEFT',
]);

export const SignMaterialSchema = z.enum([
  'ACRILICO_FOTOLUMINISCENTE',
  'VINILO_ADHERIBLE',
  'ALUMINIO_FOTOLUMINISCENTE',
  'ESTRUCTURA_BANDERA',
]);

export const SignMountingTypeSchema = z.enum([
  'ADHERIDO_PARED',
  'SOBRE_PUERTA',
  'TIPO_BANDERA',
  'COLGANTE_TECHO',
]);

export const EmergencySignDeviceSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  planoId: z.string(),
  category: NOM026SignCategorySchema,
  subType: z.string(),
  exitType: EmergencyExitTypeSchema.optional(),
  arrowDirection: ArrowDirectionSchema.optional(),
  arrowAngle: z.number().optional(),
  viewingDistanceM: z.number().default(15),
  surfaceAreaM2: z.number(),
  widthM: z.number(),
  heightM: z.number(),
  mountingHeightM: z.number().default(2.20),
  distFromCeilingM: z.number().default(0.30),
  illuminationLux: z.number().default(50),
  isPhotoluminescent: z.boolean().default(true),
  material: SignMaterialSchema.default('ACRILICO_FOTOLUMINISCENTE'),
  mountingType: SignMountingTypeSchema.default('ADHERIDO_PARED'),
  isValidLocation: z.boolean(),
  validationAlerts: z.array(z.string()),
  associatedRouteId: z.string().optional(),
  unitCostMxn: z.number().optional(),
});
