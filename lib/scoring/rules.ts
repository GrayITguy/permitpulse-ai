import { PermitRecord } from '../schemas/permit';

export interface ScoreResult {
  score: number;           // 0-100
  explanation: string[];
  reasons: string[];
}

/**
 * Simple rule-based scoring for MVP
 * Higher score = more valuable lead
 */
export function scorePermit(permit: PermitRecord): ScoreResult {
  let score = 50; // baseline
  const explanation: string[] = [];
  const reasons: string[] = [];

  // 1. Recency (newer = better)
  if (permit.issue_date) {
    const daysOld = Math.floor(
      (Date.now() - new Date(permit.issue_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysOld <= 7) {
      score += 25;
      explanation.push('Issued in the last 7 days (+25)');
      reasons.push('very_recent');
    } else if (daysOld <= 30) {
      score += 15;
      explanation.push('Issued in the last 30 days (+15)');
      reasons.push('recent');
    } else if (daysOld > 180) {
      score -= 10;
      explanation.push('Issued more than 6 months ago (-10)');
      reasons.push('old');
    }
  }

  // 2. Valuation (higher value = better)
  if (permit.valuation) {
    if (permit.valuation >= 500000) {
      score += 20;
      explanation.push('High valuation (>$500k) (+20)');
      reasons.push('high_value');
    } else if (permit.valuation >= 100000) {
      score += 10;
      explanation.push('Medium valuation (>$100k) (+10)');
      reasons.push('medium_value');
    }
  }

  // 3. Permit type priority
  const highValueTypes = ['building', 'electrical', 'plumbing', 'mechanical'];
  if (highValueTypes.includes(permit.permit_type)) {
    score += 10;
    explanation.push(`${permit.permit_type} permit type (+10)`);
    reasons.push('high_priority_type');
  }

  // 4. Contractor information present
  if (permit.contractor_name) {
    score += 5;
    explanation.push('Contractor information available (+5)');
    reasons.push('has_contractor');
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    explanation,
    reasons,
  };
}

/**
 * Batch scoring helper
 */
export function scorePermits(permits: PermitRecord[]): Array<PermitRecord & { score: ScoreResult }> {
  return permits.map(p => ({
    ...p,
    score: scorePermit(p),
  }));
}