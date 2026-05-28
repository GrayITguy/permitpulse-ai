import { createClient } from '@supabase/supabase-js';
import { normalizePermitType, PermitRecord, PermitRecordSchema } from '../schemas/permit';

// Chicago Socrata dataset for building permits
// Source: https://data.cityofchicago.org/Buildings/Building-Permits/ydr8-5enu
const CHICAGO_SOCRATA_URL = 'https://data.cityofchicago.org/resource/ydr8-5enu.json';
const CHICAGO_SOURCE = 'chicago';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // use service role for server-side upserts
);

export interface ChicagoRawPermit {
  id: string;
  permit_: string;           // permit number
  permit_type: string;
  issue_date?: string;
  expiration_date?: string;
  street_number?: string;
  street_direction?: string;
  street_name?: string;
  suffix?: string;
  work_description?: string;
  building_fee_paid?: string;
  zip_code?: string;
  latitude?: string;
  longitude?: string;
  [key: string]: unknown;    // catch-all for extra fields
}

/**
 * Fetch recent permits from Chicago Socrata API
 * @param limit - number of records to fetch (default 1000)
 */
export async function fetchChicagoPermits(limit = 1000): Promise<ChicagoRawPermit[]> {
  const params = new URLSearchParams({
    $limit: limit.toString(),
    $order: 'issue_date DESC',
  });

  const url = `${CHICAGO_SOCRATA_URL}?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'X-App-Token': process.env.CHICAGO_SOCRATA_APP_TOKEN || '', // optional but recommended
    },
  });

  if (!response.ok) {
    throw new Error(`Chicago Socrata fetch failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Normalize a single Chicago raw record into our canonical PermitRecord
 */
export function normalizeChicagoPermit(raw: ChicagoRawPermit): PermitRecord {
  const addressParts = [
    raw.street_number,
    raw.street_direction,
    raw.street_name,
    raw.suffix,
  ].filter(Boolean);

  const address = addressParts.join(' ') || 'Unknown Address';

  const normalized: PermitRecord = {
    source: CHICAGO_SOURCE,
    source_id: raw.id,
    permit_number: raw.permit_ || undefined,
    permit_type: normalizePermitType(raw.permit_type),
    permit_type_raw: raw.permit_type,
    address,
    city: 'Chicago',
    state: 'IL',
    zip: raw.zip_code,
    latitude: raw.latitude ? parseFloat(raw.latitude) : undefined,
    longitude: raw.longitude ? parseFloat(raw.longitude) : undefined,
    issue_date: raw.issue_date ? raw.issue_date.split('T')[0] : undefined,
    expiration_date: raw.expiration_date ? raw.expiration_date.split('T')[0] : undefined,
    description: raw.work_description,
    raw_data: raw as Record<string, unknown>,
    normalized_at: new Date().toISOString(),
  };

  // Validate before returning
  return PermitRecordSchema.parse(normalized);
}

/**
 * Fetch and normalize a batch of Chicago permits
 */
export async function fetchAndNormalizeChicagoPermits(limit = 1000): Promise<PermitRecord[]> {
  const rawPermits = await fetchChicagoPermits(limit);
  return rawPermits.map(normalizeChicagoPermit);
}

/**
 * Upsert normalized Chicago permits into Supabase
 * Returns counts for monitoring
 */
export async function saveChicagoPermitsToSupabase(permits: PermitRecord[]) {
  if (permits.length === 0) {
    return { inserted: 0, updated: 0, failed: 0 };
  }

  const { data, error } = await supabase
    .from('permits')
    .upsert(permits, {
      onConflict: 'source,source_id',
      ignoreDuplicates: false,
    })
    .select('id');

  if (error) {
    console.error('Supabase upsert error (Chicago):', error);
    return { inserted: 0, updated: 0, failed: permits.length };
  }

  // Simple heuristic: Supabase upsert doesn't distinguish insert vs update easily
  // For MVP we just report total processed
  return {
    inserted: data?.length ?? 0,
    updated: 0,
    failed: 0,
  };
}

/**
 * Full pipeline for Chicago: fetch → normalize → save to Supabase
 * Returns summary for monitoring / orchestrator
 */
export async function runChicagoIngestion(limit = 500) {
  console.log(`[Chicago] Starting ingestion (limit=${limit})...`);

  try {
    const permits = await fetchAndNormalizeChicagoPermits(limit);
    console.log(`[Chicago] Normalized ${permits.length} records`);

    const result = await saveChicagoPermitsToSupabase(permits);
    console.log(`[Chicago] Upsert complete:`, result);

    return {
      source: CHICAGO_SOURCE,
      fetched: permits.length,
      ...result,
      success: true,
    };
  } catch (error) {
    console.error('[Chicago] Ingestion failed:', error);
    return {
      source: CHICAGO_SOURCE,
      fetched: 0,
      inserted: 0,
      updated: 0,
      failed: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}