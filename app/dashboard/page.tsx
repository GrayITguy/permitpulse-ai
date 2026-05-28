import { createClient } from '@supabase/supabase-js';
import { scorePermit } from '@/lib/scoring/rules';
import FeedbackButtons from './FeedbackButtons';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function Dashboard() {
  const { data: permits } = await supabase
    .from('permits')
    .select('*')
    .gte('issue_date', new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0])
    .order('issue_date', { ascending: false })
    .limit(50);

  const scoredPermits = (permits || []).map(p => ({
    ...p,
    score: scorePermit(p),
  }));

  scoredPermits.sort((a, b) => b.score.score - a.score.score);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">PermitPulse Dashboard</h1>
      
      <div className="mb-6">
        <p className="text-gray-600">Showing top scored permits from the last 30 days • Rate leads to improve scoring</p>
      </div>

      <div className="grid gap-4">
        {scoredPermits.length === 0 && (
          <p className="text-gray-500">No permits found. Run ingestion first.</p>
        )}

        {scoredPermits.map((permit) => (
          <div key={permit.id} className="border rounded-lg p-6 hover:shadow-md transition">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="font-semibold text-lg">{permit.address}</div>
                <div className="text-sm text-gray-600">
                  {permit.city}, {permit.state} • {permit.permit_type}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">{permit.score.score}</div>
                <div className="text-xs text-gray-500">Lead Score</div>
              </div>
            </div>

            <div className="text-sm space-y-1 mb-4">
              {permit.score.explanation.map((line, i) => (
                <div key={i} className="text-gray-700">• {line}</div>
              ))}
            </div>

            <div className="flex gap-4 text-sm text-gray-600 mb-4">
              <div>Issued: {permit.issue_date || 'N/A'}</div>
              {permit.valuation && <div>Value: ${permit.valuation.toLocaleString()}</div>}
              {permit.contractor_name && <div>Contractor: {permit.contractor_name}</div>}
            </div>

            <FeedbackButtons permitId={permit.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
