import { createClient } from '@supabase/supabase-js';
import { runChicagoIngestion } from '../adapters/chicago';
import { runAustinIngestion } from '../adapters/austin';
import { runMiamiDadeIngestion } from '../adapters/miami-dade';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface IngestionResult {
  source: string;
  fetched: number;
  inserted: number;
  updated: number;
  failed: number;
  success: boolean;
  error?: string;
}

async function logIngestionRun(result: IngestionResult) {
  await supabase.from('ingestion_log').insert({
    source: result.source,
    run_date: new Date().toISOString().split('T')[0],
    records_fetched: result.fetched,
    records_inserted: result.inserted,
    records_failed: result.failed,
    status: result.success ? 'success' : 'failed',
    error_message: result.error || null,
    completed_at: new Date().toISOString(),
  });
}

export async function runDailyIngestion(limitPerSource = 500): Promise<IngestionResult[]> {
  console.log('=== Starting Daily Permit Ingestion ===');
  const results: IngestionResult[] = [];

  const [chicago, austin, miami] = await Promise.allSettled([
    runChicagoIngestion(limitPerSource),
    runAustinIngestion(limitPerSource),
    runMiamiDadeIngestion(limitPerSource),
  ]);

  if (chicago.status === 'fulfilled') results.push(chicago.value);
  if (austin.status === 'fulfilled') results.push(austin.value);
  if (miami.status === 'fulfilled') results.push(miami.value);

  // Log each run to the monitoring table
  for (const result of results) {
    await logIngestionRun(result);
  }

  // Console summary
  console.log('\n=== Ingestion Summary ===');
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`${status} ${r.source}: fetched=${r.fetched}, inserted=${r.inserted}, failed=${r.failed}`);
  });

  const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
  console.log(`\nTotal records inserted today: ${totalInserted}`);

  return results;
}

export async function runIngestionForSource(source: string, limit = 500) {
  if (source === 'chicago') return runChicagoIngestion(limit);
  if (source === 'austin') return runAustinIngestion(limit);
  if (source === 'miami-dade') return runMiamiDadeIngestion(limit);
  throw new Error(`Unknown source: ${source}`);
}