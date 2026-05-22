"""
Data Validation Spike - Real Building Permit Data
Uses sodapy with contractor-focused validation.
"""

from sodapy import Socrata


def categorize_trade(permit: dict) -> str:
    text = " ".join([
        str(permit.get("permit_type", "")),
        str(permit.get("description", "")),
        str(permit.get("work_description", ""))
    ]).lower()

    if any(w in text for w in ["roof", "shingle", "gutter"]):
        return "Roofing"
    elif any(w in text for w in ["hvac", "heating", "air conditioning"]):
        return "HVAC"
    elif any(w in text for w in ["plumb", "sewer"]):
        return "Plumbing"
    elif any(w in text for w in ["electric", "electrical"]):
        return "Electrical"
    return "Other"


def validate_permit(permit: dict) -> dict:
    issues = []
    score = 100

    # Date check
    date_str = permit.get("issue_date") or permit.get("issued_date")
    if date_str:
        try:
            from datetime import datetime
            issued = datetime.fromisoformat(str(date_str).replace("Z", "+00:00"))
            days_old = (datetime.now() - issued).days
            if days_old > 45:
                issues.append(f"Old ({days_old}d)")
                score -= 20
        except Exception:
            issues.append("Bad date")
            score -= 10
    else:
        issues.append("No date")
        score -= 15

    # Valuation
    val = permit.get("valuation") or permit.get("total_job_valuation")
    if val:
        try:
            if float(val) < 5000:
                issues.append("Low value")
                score -= 15
        except Exception:
            issues.append("Bad valuation")
            score -= 10
    else:
        issues.append("No valuation")
        score -= 10

    # Trade
    trade = categorize_trade(permit)
    if trade == "Other":
        issues.append("Unclear trade")
        score -= 10

    return {
        "score": max(score, 0),
        "trade": trade,
        "issues": issues,
        "high_quality": len(issues) <= 1 and score >= 70
    }


def run_spike(domain: str, dataset_id: str, limit: int = 12):
    print("=== PermitPulse AI - Data Validation Spike ===\n")
    client = Socrata(domain, None)

    try:
        results = client.get(dataset_id, limit=limit)
    except Exception as e:
        print(f"Error: {e}")
        return

    print(f"Fetched {len(results)} permits.\n")

    good = 0
    for i, p in enumerate(results, 1):
        v = validate_permit(p)
        if v["high_quality"]:
            good += 1

        addr = p.get("address") or p.get("location", "N/A")
        print(f"{i}. Score:{v['score']:3d} | {v['trade']:9s} | {str(addr)[:45]}")
        if v["issues"]:
            print(f"   Issues: {', '.join(v['issues'])}")

    print(f"\nHigh-quality leads: {good}/{len(results)} ({good/len(results)*100:.0f}%)")


if __name__ == "__main__":
    # TODO: Replace with confirmed building permit dataset
    run_spike("data.cityofchicago.org", "ydr8-5enu", 10)