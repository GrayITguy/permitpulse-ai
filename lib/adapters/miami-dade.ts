import { createClient } from '@supabase/supabase-js';
import { normalizePermitType, PermitRecord, PermitRecordSchema } from '../schemas/permit';

// Miami-Dade ArcGIS FeatureServer for building permits
// Note: Real endpoint should come from Phase 0 validation (example pattern below)
const MIAMI_ARCGIS_URL = 'https://services.arcgis.com/YourOrgID/arcgis/rest/services/Building_Permits/FeatureServer/0/query';
const MIAMI_SOURCE = 'miami-dade';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface MiamiRawPermit {
  attributes: {
    OBJECTID: number;
    PERMIT_NUM?: string;
    PERMIT_TYPE?: string;
    ISSUE_DATE?: number;       // ArcGIS often uses epoch ms
    EXP_DATE?: number;
    ADDRESS?: string;
    CITY?: string;
    STATE?: string;
    ZIP?: string;
    LAT?: number;
    LONG?: number;
    DESCRIPTION?: string;
    CONTRACTOR?: string;
    [key: string]: unknown;
  };
  geometry?: {
    x: number;
    y: number;
  };
}

export async function fetchMiamiDadePermits(limit = 1000): Promise<MiamiRawPermit[]> {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: '*',
    resultRecordCount: limit.toString(),
    orderByFields: 'ISSUE_DATE DESC',
    f: 'json',
    returnGeometry: 'true',
  });

  const url = `${MIAMI_ARCGIS_URL}?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Miami-Dade ArcGIS fetch failed: ${response.status}`);
  }

  const data = await response.json();
  return data.features || [];
}

export function normalizeMiamiDadePermit(raw: MiamiRawPermit): PermitRecord {
  const attrs = raw.attributes;

  const issueDate = attrs.ISSUE_DATE
    ? new Date(attrs.ISSUE_DATE).toISOString().split('T')[0]
    : undefined;

  const expDate = attrs.EXP_DATE
    ? new Date(attrs.EXP_DATE).toISOString().split('T')[0]
    : undefined;

  const normalized: PermitRecord = {
    source: MIAMI_SOURCE,
    source_id: String(attrs.OBJECTID),
    permit_number: attrs.PERMIT_NUM,
    permit_type: normalizePermitType(attrs.PERMIT_TYPE),
    permit_type_raw: attrs.PERMIT_TYPE,
    address: attrs.ADDRESS || 'Unknown Address',
    city: attrs.CITY || 'Miami-Dade',
    state: attrs.STATE || 'FL',
    zip: attrs.ZIP,
    latitude: attrs.LAT ?? raw.geometry?.y,
    longitude: attrs.LONG ?? raw.geometry?.x,
    issue_date: issueDate,
    expiration_date: expDate,
    description: attrs.DESCRIPTION,
    contractor_name: attrs.CONTRACTOR,
    raw_data: raw as unknown as Record<string, unknown>,
    normalized_at: new Date().toISOString(),
  };

  return PermitRecordSchema.parse(normalized);
}

export async function fetchAndNormalizeMiamiDadePermits(limit = 1000): Promise<PermitRecord[]> {
  const raw = await fetchMiamiDadePermits(limit);
  return raw.map(normalizeMiamiDadePermit);
}

export async function saveMiamiDadePermitsToSupabase(permits: PermitRecord[]) {
  if (permits.length === 0) return { inserted: 0, updated: 0, failed: 0 };

  const { data, error } = await supabase
    .from('permits')
    .upsert(permits, { onConflict: 'source,source_id' })
    .select('id');

  if (error) {
    console.error('Supabase upsert error (Miami-Dade):', error);
    return { inserted: 0, updated: 0, failed: permits.length };
  }

  return { inserted: data?.length ?? 0, updated: 0, failed: 0 };
}

export async function runMiamiDadeIngestion(limit = 500) {
  console.log(`[Miami-Dade] Starting ingestion (limit=${limit})...`);
  try {
    const permits = await fetchAndNormalizeMiamiDadePermits(limit);
    const result = await saveMiamiDadePermitsToSupabase(permits);
    console.log(`[Miami-Dade] Complete:`, result);
    return { source: MIAMI_SOURCE, fetched: permits.length, ...result, success: true };
  } catch (error) {
    console.error('[Miami-Dade] Failed:', error);
    return { source: MIAMI_SOURCE, fetched: 0, inserted: 0, updated: 0, failed: 0, success: false, error: String(error) };
  }
}