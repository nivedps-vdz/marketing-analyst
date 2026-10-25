"""Metric definitions and aggregation rules.

Rules (see docs/metrics.md):
- Ratios are always computed from summed base metrics, never by averaging ratios.
- A ratio with a zero or missing denominator is ``None`` (undefined), never 0 or infinity.
- Conversions are grouped by conversion type and never summed across types.
- A "result" is a conversion of the campaign's primary conversion type. Cost per result uses only the
  spend of campaigns whose primary type is that conversion type.
- Monetary values from different currencies are never combined.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

# Conversion types surfaced as KPIs. Other types are stored but not summarised in Phase 1.
LEAD = "lead"
PURCHASE = "purchase"

REACH_NOTE = "Sum of daily reach. People reached on more than one day are counted more than once."

# Which direction is favourable for each metric. "neutral" = no judgement (e.g. spend).
FAVOURABLE: dict[str, str] = {
    "spend": "neutral",
    "impressions": "up",
    "reach": "up",
    "clicks": "up",
    "ctr": "up",
    "cpc": "down",
    "cpm": "down",
    "leads": "up",
    "cost_per_lead": "down",
    "purchases": "up",
    "cost_per_purchase": "down",
    "purchase_value": "up",
    "roas": "up",
}

MONETARY = {"spend", "cpc", "cpm", "cost_per_lead", "cost_per_purchase", "purchase_value", "roas"}

FLAT_THRESHOLD_PCT = 0.5


def safe_div(numerator: float | None, denominator: float | None) -> float | None:
    if numerator is None or denominator is None or denominator == 0:
        return None
    return numerator / denominator


def ctr(clicks: float | None, impressions: float | None) -> float | None:
    r = safe_div(clicks, impressions)
    return None if r is None else r * 100


def cpc(spend: float | None, clicks: float | None) -> float | None:
    return safe_div(spend, clicks)


def cpm(spend: float | None, impressions: float | None) -> float | None:
    r = safe_div(spend, impressions)
    return None if r is None else r * 1000


def cpa(spend: float | None, conversions: float | None) -> float | None:
    return safe_div(spend, conversions)


def roas(conversion_value: float | None, spend: float | None) -> float | None:
    return safe_div(conversion_value, spend)


@dataclass
class ResultTotals:
    """Totals for one conversion type, restricted to campaigns whose primary type is that type."""

    count: int = 0
    value: float | None = None
    spend: float = 0.0

    def add_value(self, value: float | None) -> None:
        if value is not None:
            self.value = (self.value or 0.0) + value


@dataclass
class Totals:
    spend: float = 0.0
    impressions: int = 0
    reach: int | None = None
    clicks: int = 0
    rows: int = 0
    results: dict[str, ResultTotals] = field(default_factory=dict)

    def add_delivery(
        self,
        *,
        spend: float,
        impressions: int,
        reach: int | None,
        clicks: int,
        primary_type: str | None,
        rows: int = 1,
    ) -> None:
        self.spend += spend or 0.0
        self.impressions += impressions or 0
        self.clicks += clicks or 0
        if reach is not None:
            self.reach = (self.reach or 0) + reach
        self.rows += rows
        if primary_type:
            self.results.setdefault(primary_type, ResultTotals()).spend += spend or 0.0

    def add_conversions(self, conversion_type: str, count: int, value: float | None) -> None:
        r = self.results.setdefault(conversion_type, ResultTotals())
        r.count += count or 0
        r.add_value(value)

    def merge(self, other: "Totals") -> None:
        self.spend += other.spend
        self.impressions += other.impressions
        self.clicks += other.clicks
        self.rows += other.rows
        if other.reach is not None:
            self.reach = (self.reach or 0) + other.reach
        for t, r in other.results.items():
            mine = self.results.setdefault(t, ResultTotals())
            mine.count += r.count
            mine.spend += r.spend
            mine.add_value(r.value)


def _m(value: float | int | None, reason: str | None = None, note: str | None = None) -> dict[str, Any]:
    out: dict[str, Any] = {"value": value, "unavailable_reason": None if value is not None else reason}
    if note:
        out["note"] = note
    return out


def compute_metrics(
    t: Totals,
    *,
    currency_reason: str | None = None,
    no_data_reason: str = "No delivery data for this period",
) -> dict[str, dict[str, Any]]:
    """Compute every KPI from base totals.

    ``currency_reason``: when set, monetary metrics are unavailable with this reason
    (for example because the selection mixes currencies).
    """
    keys = list(FAVOURABLE)
    if t.rows == 0:
        return {k: _m(None, no_data_reason) for k in keys}

    out: dict[str, dict[str, Any]] = {
        "spend": _m(t.spend),
        "impressions": _m(t.impressions),
        "reach": _m(t.reach, "Reach not reported", REACH_NOTE),
        "clicks": _m(t.clicks),
        "ctr": _m(ctr(t.clicks, t.impressions), "No impressions, so CTR is undefined"),
        "cpc": _m(cpc(t.spend, t.clicks), "No clicks, so CPC is undefined"),
        "cpm": _m(cpm(t.spend, t.impressions), "No impressions, so CPM is undefined"),
    }

    lead = t.results.get(LEAD)
    if lead is None:
        out["leads"] = _m(None, "No lead-objective campaigns in this selection")
        out["cost_per_lead"] = _m(None, "No lead-objective campaigns in this selection")
    else:
        out["leads"] = _m(lead.count)
        out["cost_per_lead"] = _m(cpa(lead.spend, lead.count), "No leads recorded, so cost per lead is undefined")

    purchase = t.results.get(PURCHASE)
    if purchase is None:
        reason = "No sales-objective campaigns in this selection"
        for k in ("purchases", "cost_per_purchase", "purchase_value", "roas"):
            out[k] = _m(None, reason)
    else:
        out["purchases"] = _m(purchase.count)
        out["cost_per_purchase"] = _m(
            cpa(purchase.spend, purchase.count), "No purchases recorded, so cost per purchase is undefined"
        )
        out["purchase_value"] = _m(purchase.value, "Purchase value not reported")
        out["roas"] = _m(
            roas(purchase.value, purchase.spend),
            "Purchase value not reported" if purchase.value is None else "No spend on sales campaigns",
        )

    if currency_reason:
        for k in MONETARY:
            out[k] = _m(None, currency_reason)
    return out


def pct_change(current: float | None, previous: float | None) -> float | None:
    if current is None or previous is None or previous == 0:
        return None
    return (current - previous) / abs(previous) * 100


def assess_change(metric: str, change: float | None) -> dict[str, str | None]:
    """Direction of change and whether it is favourable for this metric."""
    if change is None:
        return {"direction": None, "assessment": None}
    if abs(change) < FLAT_THRESHOLD_PCT:
        return {"direction": "flat", "assessment": "neutral"}
    direction = "up" if change > 0 else "down"
    fav = FAVOURABLE.get(metric, "neutral")
    if fav == "neutral":
        assessment = "neutral"
    else:
        assessment = "good" if fav == direction else "bad"
    return {"direction": direction, "assessment": assessment}


def with_comparison(
    current: dict[str, dict[str, Any]], previous: dict[str, dict[str, Any]]
) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for key, cur in current.items():
        prev_val = previous.get(key, {}).get("value")
        change = pct_change(cur.get("value"), prev_val)
        out[key] = {**cur, "previous": prev_val, "change_pct": change, **assess_change(key, change)}
    return out


def entity_summary(t: Totals, primary_type: str | None) -> dict[str, Any]:
    """Flat metrics for a single campaign, ad set or ad (one primary conversion type)."""
    r = t.results.get(primary_type) if primary_type else None
    count = r.count if r else (0 if primary_type else None)
    value = r.value if r else None
    return {
        "spend": t.spend,
        "impressions": t.impressions,
        "reach": t.reach,
        "clicks": t.clicks,
        "ctr": ctr(t.clicks, t.impressions),
        "cpc": cpc(t.spend, t.clicks),
        "cpm": cpm(t.spend, t.impressions),
        "result_type": primary_type,
        "results": count,
        "cpa": cpa(t.spend, count) if primary_type else None,
        "result_value": value,
        "roas": roas(value, t.spend) if primary_type == PURCHASE else None,
        "has_data": t.rows > 0,
    }
