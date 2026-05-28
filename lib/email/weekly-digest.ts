import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { scorePermit } from '../scoring/rules';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function sendWeeklyDigest(to: string) {
  // Get top permits from the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0];

  const { data: permits } = await supabase
    .from('permits')
    .select('*')
    .gte('issue_date', sevenDaysAgo)
    .order('issue_date', { ascending: false })
    .limit(20);

  if (!permits || permits.length === 0) {
    console.log('No new permits for weekly digest');
    return;
  }

  const scored = permits
    .map(p => ({ ...p, score: scorePermit(p) }))
    .sort((a, b) => b.score.score - a.score.score)
    .slice(0, 10);

  const html = `
    <h1>PermitPulse Weekly Digest</h1>
    <p>Here are the top ${scored.length} new permit leads from the past week:</p>
    <table style="width:100%; border-collapse: collapse;">
      ${scored.map(p => `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 12px 0;">
            <strong>${p.address}</strong><br>
            <span style="color:#666">${p.city}, ${p.state} • ${p.permit_type}</span>
          </td>
          <td style="text-align:right; padding:12px 0;">
            <span style="font-size:20px; font-weight:bold; color:#2563eb">${p.score.score}</span>
          </td>
        </tr>
      `).join('')}
    </table>
    <p style="margin-top:24px; color:#666; font-size:13px;">
      View full dashboard: <a href="http://localhost:3000/dashboard">Open Dashboard</a>
    </p>
  `;

  await resend.emails.send({
    from: 'PermitPulse <digest@yourdomain.com>',
    to,
    subject: `PermitPulse Weekly Digest — ${scored.length} New Leads`,
    html,
  });

  console.log(`Weekly digest sent to ${to} with ${scored.length} leads`);
}