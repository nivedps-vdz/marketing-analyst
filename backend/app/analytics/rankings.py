"""Objective-aware ad rankings with explicit eligibility criteria.

An ad is never called a top performer on CTR alone. Ads below the data-sufficiency thresholds are listed
under "needs more data" instead of being ranked.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.analytics.metrics import LEAD, PURCHASE
from app.analytics.sorting import sort_nulls_last


@dataclass(frozen=True)
class Thresholds:
    min_spend: float
    min_impressions: int
    min_conversions: int


@dataclass
class AdPerf:
    """Period metrics for one ad, as produced by ``metrics.entity_summary`` plus identifying fields."""

    ad_id: int
    name: str
    campaign_name: str
    objective_category: str
    format: str
    m: dict[str, Any]

    def get(self, key: str) -> Any:
        return self.m.get(key)


def has_sufficient_delivery(ad: AdPerf, th: Thresholds) -> bool:
    return (ad.get("spend") or 0) >= th.min_spend and (ad.get("impressions") or 0) >= th.min_impressions


def _entry(ad: AdPerf, metric: str) -> dict[str, Any]:
    return {
        "ad_id": ad.ad_id,
        "name": ad.name,
        "campaign_name": ad.campaign_name,
        "format": ad.format,
        "metric_value": ad.get(metric),
        "spend": ad.get("spend"),
        "impressions": ad.get("impressions"),
        "results": ad.get("results"),
        "result_type": ad.get("result_type"),
        "ctr": ad.get("ctr"),
        "cpa": ad.get("cpa"),
        "roas": ad.get("roas"),
    }


def _ranking(
    key: str,
    title: str,
    criteria: str,
    metric: str,
    descending: bool,
    pool: list[AdPerf],
    eligible: list[AdPerf],
    limit: int,
    caveat: str | None = None,
) -> dict[str, Any]:
    ranked = sort_nulls_last(eligible, lambda a: a.get(metric), descending=descending, tiebreak=lambda a: a.ad_id)
    ranked = [a for a in ranked if a.get(metric) is not None]
    return {
        "key": key,
        "title": title,
        "criteria": criteria,
        "metric": metric,
        "order": "desc" if descending else "asc",
        "caveat": caveat,
        "considered": len(pool),
        "eligible": len(ranked),
        "entries": [_entry(a, metric) for a in ranked[:limit]],
    }


RESULT_WORDS = {LEAD: ("lead", "leads"), PURCHASE: ("purchase", "purchases")}


def rank_ads(ads: list[AdPerf], th: Thresholds, limit: int = 5) -> dict[str, Any]:
    rankings: list[dict[str, Any]] = []
    money = f"spend ≥ {th.min_spend:,.0f}"
    conv_rule = f"at least {th.min_conversions} results"

    sales = [a for a in ads if a.objective_category == "sales"]
    if sales:
        elig = [
            a for a in sales
            if has_sufficient_delivery(a, th) and (a.get("results") or 0) >= th.min_conversions
            and a.get("roas") is not None
        ]
        rankings.append(_ranking(
            "highest_roas", "Highest ROAS",
            f"Sales-objective ads with {money}, ≥ {th.min_impressions:,} impressions and {conv_rule}. "
            "ROAS = attributed purchase value ÷ spend.",
            "roas", True, sales, elig, limit,
        ))

    for ctype in (LEAD, PURCHASE):
        pool = [a for a in ads if a.get("result_type") == ctype]
        if not pool:
            continue
        one, many = RESULT_WORDS[ctype]
        elig = [a for a in pool if has_sufficient_delivery(a, th) and (a.get("results") or 0) >= th.min_conversions]
        rankings.append(_ranking(
            f"lowest_cost_per_{one}", f"Lowest cost per {one}",
            f"Ads whose campaign optimises for {many}, with {money}, ≥ {th.min_impressions:,} impressions "
            f"and {conv_rule}. Cost per {one} = spend ÷ {many}.",
            "cpa", False, pool, elig, limit,
        ))
        elig_vol = [a for a in pool if (a.get("results") or 0) > 0]
        rankings.append(_ranking(
            f"most_{many}", f"Most {many}",
            f"Ads whose campaign optimises for {many}, ranked by attributed {many} in the period. "
            "Volume alone does not show efficiency; read together with cost per result.",
            "results", True, pool, elig_vol, limit,
        ))

    traffic = [a for a in ads if a.objective_category == "traffic"]
    if traffic:
        elig = [a for a in traffic if has_sufficient_delivery(a, th) and (a.get("clicks") or 0) > 0]
        rankings.append(_ranking(
            "lowest_cpc_traffic", "Lowest CPC (traffic campaigns)",
            f"Traffic-objective ads with {money} and ≥ {th.min_impressions:,} impressions. CPC = spend ÷ clicks.",
            "cpc", False, traffic, elig, limit,
        ))

    awareness = [a for a in ads if a.objective_category == "awareness"]
    if awareness:
        elig = [a for a in awareness if has_sufficient_delivery(a, th)]
        rankings.append(_ranking(
            "lowest_cpm_awareness", "Lowest CPM (awareness campaigns)",
            f"Awareness-objective ads with {money} and ≥ {th.min_impressions:,} impressions. "
            "CPM = spend ÷ impressions × 1,000.",
            "cpm", False, awareness, elig, limit,
        ))

    elig_ctr = [a for a in ads if (a.get("impressions") or 0) >= th.min_impressions]
    rankings.append(_ranking(
        "highest_ctr", "Highest CTR",
        f"All ads with ≥ {th.min_impressions:,} impressions. CTR = clicks ÷ impressions × 100.",
        "ctr", True, ads, elig_ctr, limit,
        caveat="CTR is an engagement signal, not a performance verdict. Check results and cost per result.",
    ))

    needs_data = [a for a in ads if not has_sufficient_delivery(a, th)]
    needs_data = sort_nulls_last(needs_data, lambda a: a.get("spend"), descending=True, tiebreak=lambda a: a.ad_id)
    return {
        "thresholds": {
            "min_spend": th.min_spend,
            "min_impressions": th.min_impressions,
            "min_conversions": th.min_conversions,
        },
        "rankings": rankings,
        "needs_more_data": {
            "criteria": f"Ads with spend below {th.min_spend:,.0f} or fewer than {th.min_impressions:,} impressions "
            "in the period. Too little data to judge.",
            "entries": [_entry(a, "spend") for a in needs_data],
        },
    }
