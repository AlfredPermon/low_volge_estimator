import { z } from 'zod';

export type ExtinguisherType = 'PQS_ABC' | 'CO2' | 'CLEAN_AGENT' | 'WATER_PRESSURIZED' | 'AFFF' | 'CLASS_K';

export type ExtinguisherCapacity =
  | '2.5kg'
  | '4.5kg'
  | '4.6kg'
  | '6.0kg'
  | '9.0kg'
  | '10kg'
  | '10.0kg'
  | '5lbs'
  | '10lbs'
  | '6L'
  | '10L'
  | '6.0L'
  | '9.5L'
  | '9.0L'
  | '10.0L';

export type HospitalRiskZone = 'HIGH_RISK' | 'ORDINARY_RISK';

export interface ExtinguisherDevice {
  id: string;
  x: number;
  y: number;
  planoId: string;
  type: ExtinguisherType;
  capacity: ExtinguisherCapacity;
  riskZone: HospitalRiskZone;
  mountingHeight: number; // default 1.50m (NOM-002)
  signalingHeight: number; // default 1.80m - 2.00m (NOM-026)
  coverageRadiusMeters: number; // 15m (HIGH_RISK) o 30m (ORDINARY_RISK)
  hasSignaling: boolean;
  isValidLocation: boolean;
  validationAlerts: string[];
  medicalArea?: string;
}

// ─── Zod Schemas for Validation ─────────────────────────────────────────────

export const ExtinguisherTypeSchema = z.enum([
  'PQS_ABC',
  'CO2',
  'CLEAN_AGENT',
  'WATER_PRESSURIZED',
  'AFFF',
  'CLASS_K',
]);

export const ExtinguisherCapacitySchema = z.enum([
  '2.5kg',
  '4.5kg',
  '4.6kg',
  '6.0kg',
  '9.0kg',
  '10kg',
  '10.0kg',
  '5lbs',
  '10lbs',
  '6L',
  '10L',
  '6.0L',
  '9.5L',
  '9.0L',
  '10.0L',
]);

export const HospitalRiskZoneSchema = z.enum(['HIGH_RISK', 'ORDINARY_RISK']);

export const ExtinguisherDeviceSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  planoId: z.string(),
  type: ExtinguisherTypeSchema,
  capacity: ExtinguisherCapacitySchema,
  riskZone: HospitalRiskZoneSchema,
  mountingHeight: z.number().default(1.50),
  signalingHeight: z.number().default(1.90),
  coverageRadiusMeters: z.number(),
  hasSignaling: z.boolean().default(true),
  isValidLocation: z.boolean(),
  validationAlerts: z.array(z.string()),
  medicalArea: z.string().optional(),
});
