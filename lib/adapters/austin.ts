import { createClient } from '@supabase/supabase-js';
import { normalizePermitType, PermitRecord, PermitRecordSchema } from '../schemas/permit';

// Austin Socrata dataset for building permits
// Source: https://data.austintexas.gov/Buildings-and-Development/Issued-Construction-Permits/vs4q-5y6u
const AUSTIN_SOCRATA_URL = 'https://data.austintexas.gov/resource/vs4q-5y6u.json';
const AUSTIN_SOURCE = 'austin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AustinRawPermit {
  permit_number?: string;
  permit_type?: string;
  issue_date?: string;
  expiration_date?: string;
  original_address1?: string;
  original_city?: string;
  original_state?: string;
  original_zip?: string;
  latitude?: string;
  longitude?: string;
  work_description?: string;
  contractor_company_name?: string;
  [key: string]: unknown;
}

export async function fetchAustinPermits(limit = 1000): Promise<AustinRawPermit[]> {
  const params = new URLSearchParams({
    $limit: limit.toString(),
    $order: 'issue_date DESC',
  });

  const url = `${AUSTIN_SOCRATA_URL}?${params.toString()}`;

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Austin Socrata fetch failed: ${response.status}`);
  }

  return response.json();
}

export function normalizeAustinPermit(raw: AustinRawPermit): PermitRecord {
  const normalized: PermitRecord = {
    source: AUSTIN_SOURCE,
    source_id: raw.permit_number || crypto.randomUUID(),
    permit_number: raw.permit_number,
    permit_type: normalizePermitType(raw.permit_type),
    permit_type_raw: raw.permit_type,
    address: raw.original_address1 || 'Unknown Address',
    city: raw.original_city || 'Austin',
    state: raw.original_state || 'TX',
    zip: raw.original_zip,
    latitude: raw.latitude ? parseFloat(raw.latitude) : undefined,
    longitude: raw.longitude ? parseFloat(raw.longitude) : undefined,
    issue_date: raw.issue_date ? raw.issue_date.split('T')[0] : undefined,
    expiration_date: raw.expiration_date ? raw.expiration_date.split('T')[0] : undefined,
    description: raw.work_description,
    contractor_name: raw.contractor_company_name,
    raw_data: raw as Record<string, unknown>,
    normalized_at: new Date().toISOString(),
  };

  return PermitRecordSchema.parse(normalized);
}

export async function fetchAndNormalizeAustinPermits(limit = 1000): Promise<PermitRecord[]> {
  const raw = await fetchAustinPermits(limit);
  return raw.map(normalizeAustinPermit);
}

export async function saveAustinPermitsToSupabase(permits: PermitRecord[]) {
  if (permits.length === 0) return { inserted: 0, updated: 0, failed: 0 };

  const { data, error } = await supabase
    .from('permits')
    .upsert(permits, { onConflict: 'source,source_id' })
    .select('id');

  if (error) {
    console.error('Supabase upsert error (Austin):', error);
    return { inserted: 0, updated: 0, failed: permits.length };
  }

  return { inserted: data?.length ?? 0, updated: 0, failed: 0 };
}

export async function runAustinIngestion(limit = 500) {
  console.log(`[Austin] Starting ingestion (limit=${limit})...`);
  try {
    const permits = await fetchAndNormalizeAustinPermits(limit);
    const result = await saveAustinPermitsToSupabase(permits);
    console.log(`[Austin] Complete:`, result);
    return { source: AUSTIN_SOURCE, fetched: permits.length, ...result, success: true };
  } catch (error) {
    console.error('[Austin] Failed:', error);
    return { source: AUSTIN_SOURCE, fetched: 0, inserted: 0, updated: 0, failed: 0, success: false, error: String(error) };
  }
}