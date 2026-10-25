"""Deterministic, template-based insights.

Every insight carries the numbers it is based on (``evidence``) and ``basis = "calculated"``.
Wording avoids causal claims: "efficiency declined" is used instead of "creative fatigue".
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.analytics.metrics import LEAD, PURCHASE, cpa, pct_change
from app.analytics.rankings import RESULT_WORDS, AdPerf, Thresholds, has_sufficient_delivery

BUDGET_MULTIPLIER = 3          # "consuming budget" = spend >= 3 x min_spend
DECLINE_PCT = 30.0             # CPA up or ROAS down by at least this much
FORMAT_ADVANTAGE_PCT = 20.0    # format CPA at least this much better than overall
FORMAT_MAX_SPEND_SHARE = 0.30  # ...while holding less than this share of spend


@dataclass
class CampaignPerf:
    campaign_id: int
    name: str
    m: dict[str, Any]


def _insight(kind: str, severity: str, title: str, detail: str, entity: dict, evidence: dict) -> dict:
    return {
        "kind": kind,
        "severity": severity,  # "positive" | "info" | "warning"
        "title": title,
        "detail": detail,
        "entity": entity,
        "evidence": evidence,
        "basis": "calculated",
    }


def budget_without_results(campaigns: list[CampaignPerf], th: Thresholds) -> list[dict]:
    out = []
    floor = th.min_spend * BUDGET_MULTIPLIER
    for c in campaigns:
        rtype = c.m.get("result_type")
        if not rtype:
            continue
        spend, results = c.m.get("spend") or 0, c.m.get("results") or 0
        if spend >= floor and results < th.min_conversions:
            _, many = RESULT_WORDS.get(rtype, (rtype, rtype + "s"))
            out.append(_insight(
                "budget_without_results", "warning",
                f"{c.name} is spending without enough {many}",
                f"Spent {spend:,.2f} with {results} {many} in the period (threshold: {th.min_conversions}). "
                "Review targeting, offer and tracking before adding budget.",
                {"type": "campaign", "id": c.campaign_id, "name": c.name},
                {"spend": spend, "results": results, "result_type": rtype, "spend_floor": floor},
            ))
    return out


def declining_efficiency(
    first: dict[int, AdPerf], second: dict[int, AdPerf], th: Thresholds
) -> list[dict]:
    """Compare the earlier and later halves of the period for each ad.

    Flags an ad only when both halves have sufficient delivery, the earlier half had enough results, the
    efficiency metric worsened by at least DECLINE_PCT and CTR also fell. CTR alone never triggers a flag.
    """
    out = []
    for ad_id, a in first.items():
        b = second.get(ad_id)
        if b is None or not has_sufficient_delivery(a, th) or not has_sufficient_delivery(b, th):
            continue
        rtype = a.get("result_type")
        if rtype not in (LEAD, PURCHASE) or (a.get("results") or 0) < th.min_conversions:
            continue
        ctr_change = pct_change(b.get("ctr"), a.get("ctr"))
        if ctr_change is None or ctr_change >= 0:
            continue

        if rtype == PURCHASE:
            metric, before, after = "roas", a.get("roas"), b.get("roas")
            change = pct_change(after, before)
            if after is None and (b.get("results") or 0) == 0:
                change = -100.0
            declined = change is not None and change <= -DECLINE_PCT
        else:
            metric, before, after = "cpa", a.get("cpa"), b.get("cpa")
            change = pct_change(after, before)
            declined = (change is not None and change >= DECLINE_PCT) or (b.get("results") or 0) == 0
        if not declined:
            continue

        label = "ROAS" if metric == "roas" else f"cost per {RESULT_WORDS[rtype][0]}"
        out.append(_insight(
            "declining_efficiency", "warning",
            f"Efficiency declined: {a.name}",
            f"{label} moved from {_fmt(before)} to {_fmt(after)} between the first and second half of the period, "
            f"and CTR changed by {ctr_change:.0f}%. Possible causes include audience saturation, seasonality, "
            "competition or landing-page changes. Investigate before pausing or replacing the creative.",
            {"type": "ad", "id": ad_id, "name": a.name},
            {
                "metric": metric,
                "first_half": before,
                "second_half": after,
                "change_pct": change,
                "ctr_first_half": a.get("ctr"),
                "ctr_second_half": b.get("ctr"),
                "ctr_change_pct": ctr_change,
            },
        ))
    return out


def formats_worth_testing(
    by_format: dict[str, dict[str, Any]], overall: dict[str, dict[str, float]], th: Thresholds
) -> list[dict]:
    """``by_format[fmt][ctype] = {spend, results}``; ``overall[ctype] = {spend, results}``."""
    out = []
    for ctype, tot in overall.items():
        overall_cpa = cpa(tot.get("spend"), tot.get("results"))
        if overall_cpa is None or not tot.get("spend"):
            continue
        for fmt, per_type in by_format.items():
            if fmt == "unknown":
                continue
            f = per_type.get(ctype)
            if not f or f["spend"] < th.min_spend or f["results"] < th.min_conversions:
                continue
            f_cpa = cpa(f["spend"], f["results"])
            share = f["spend"] / tot["spend"]
            advantage = pct_change(f_cpa, overall_cpa)
            if advantage is not None and advantage <= -FORMAT_ADVANTAGE_PCT and share < FORMAT_MAX_SPEND_SHARE:
                one = RESULT_WORDS.get(ctype, (ctype, ctype))[0]
                out.append(_insight(
                    "format_worth_testing", "positive",
                    f"{fmt.capitalize()} ads deserve further testing",
                    f"{fmt.capitalize()} ads achieved a cost per {one} of {f_cpa:,.2f} against {overall_cpa:,.2f} overall, "
                    f"with only {share * 100:.0f}% of spend. This is an observed difference, not proof that the format "
                    "causes better results. Test with a controlled budget.",
                    {"type": "format", "id": fmt, "name": fmt},
                    {"result_type": ctype, "format_cpa": f_cpa, "overall_cpa": overall_cpa, "spend_share": share},
                ))
    return out


def ranking_highlights(rankings: dict[str, Any]) -> list[dict]:
    out = []
    for r in rankings.get("rankings", []):
        if r["key"] == "highest_ctr" or not r["entries"]:
            continue
        top = r["entries"][0]
        title = f"{r['title']}: {top['name']}"
        out.append(_insight(
            r["key"], "positive", title,
            f"Ranked first for “{r['title']}”. Criteria: {r['criteria']}",
            {"type": "ad", "id": top["ad_id"], "name": top["name"]},
            {"metric": r["metric"], "value": top["metric_value"], "spend": top["spend"], "results": top["results"]},
        ))
    n = len(rankings.get("needs_more_data", {}).get("entries", []))
    if n:
        out.append(_insight(
            "needs_more_data", "info", f"{n} ad{' needs' if n == 1 else 's need'} more data",
            rankings["needs_more_data"]["criteria"] + " These ads are excluded from rankings.",
            {"type": "ads", "id": None, "name": None},
            {"count": n},
        ))
    return out


def _fmt(v: float | None) -> str:
    return "undefined (no results)" if v is None else f"{v:,.2f}"
