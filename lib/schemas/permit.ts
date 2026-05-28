import { z } from 'zod';

// Canonical normalized permit record (adapted from Phase 1 plan for TS/Zod)
export const PermitRecordSchema = z.object({
  id: z.string().uuid().optional(),
  source: z.string().min(1),                    // 'chicago', 'austin', 'miami-dade', etc.
  source_id: z.string().min(1),
  permit_number: z.string().optional(),
  permit_type: z.string().min(1),               // normalized canonical type
  permit_type_raw: z.string().optional(),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  status: z.string().optional(),
  issue_date: z.string().date().optional(),     // ISO date string
  expiration_date: z.string().date().optional(),
  valuation: z.number().positive().optional(),
  contractor_name: z.string().optional(),
  contractor_license: z.string().optional(),
  description: z.string().optional(),
  raw_data: z.record(z.unknown()).optional(),   // original JSON for audit
  normalized_at: z.string().datetime().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type PermitRecord = z.infer<typeof PermitRecordSchema>;

// Normalized permit types we support (expand as needed)
export const CANONICAL_PERMIT_TYPES = [
  'building',
  'electrical',
  'plumbing',
  'mechanical',
  'fire',
  'sign',
  'demolition',
  'fence',
  'roofing',
  'hvac',
  'other',
] as const;

export type CanonicalPermitType = typeof CANONICAL_PERMIT_TYPES[number];

// Basic permit type mapper (rule-based normalization for MVP)
export function normalizePermitType(rawType: string | null | undefined): CanonicalPermitType {
  if (!rawType) return 'other';

  const normalized = rawType.toLowerCase().trim();

  // Common mappings (expand with real data from sources)
  const typeMap: Record<string, CanonicalPermitType> = {
    // Building
    'building permit': 'building',
    'commercial building': 'building',
    'residential building': 'building',
    'new construction': 'building',

    // Electrical
    'electrical': 'electrical',
    'electrical permit': 'electrical',
    'electric': 'electrical',

    // Plumbing
    'plumbing': 'plumbing',
    'plumbing permit': 'plumbing',

    // Mechanical / HVAC
    'mechanical': 'mechanical',
    'hvac': 'hvac',
    'heating': 'mechanical',
    'cooling': 'mechanical',

    // Fire
    'fire': 'fire',
    'fire alarm': 'fire',
    'fire suppression': 'fire',

    // Other common
    'sign': 'sign',
    'demolition': 'demolition',
    'fence': 'fence',
    'roof': 'roofing',
    'roofing': 'roofing',
  };

  return typeMap[normalized] || 'other';
}

// Helper to safely parse raw data into PermitRecord
export function parsePermitRecord(data: unknown): PermitRecord {
  return PermitRecordSchema.parse(data);
}