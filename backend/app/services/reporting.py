"""Builds API response payloads from aggregated totals. No ratio maths lives here; see app.analytics."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.analytics import insights as I
from app.analytics import metrics as M
from app.analytics.metrics import ResultTotals, Totals
from app.analytics.periods import Period
from app.analytics.rankings import AdPerf, Thresholds, rank_ads
from app.analytics.sorting import sort_nulls_last
from app.models import Ad, AdAccount, AdSet, Campaign, Client, Creative, DailyAdMetric
from app.platforms import OBJECTIVE_CATEGORIES, PLATFORMS, objective_category
from app.services.aggregation import Scope, aggregate, currencies, data_bounds, total

ENTITY_SORT_KEYS = {"name", "spend", "impressions", "clicks", "ctr", "cpc", "cpm", "results", "cpa", "roas"}

FORMAT_LABELS = {
    "image": "Image",
    "video": "Video",
    "carousel": "Carousel",
    "other": "Other",
    "unknown": "Unknown",
}


# --------------------------------------------------------------------------- helpers


def _currency(db: Session, scope: Scope) -> tuple[str | None, str | None, int]:
    found = currencies(db, scope)
    if len(found) > 1:
        return None, (
            f"Accounts in this selection use different currencies ({', '.join(sorted(found))}); "
            "money values cannot be combined"
        ), len(found)
    return (next(iter(found)) if found else None), None, len(found)


def _no_data_reason(scope: Scope, account_currencies: int) -> str:
    if scope.platform and not PLATFORMS.get(scope.platform, {}).get("enabled", False):
        return f"{PLATFORMS.get(scope.platform, {}).get('label', scope.platform)} is not connected yet"
    if account_currencies == 0:
        return "No ad account connected"
    return "No delivery data for this period"


def _values(metrics: dict[str, dict[str, Any]]) -> dict[str, Any]:
    return {k: v["value"] for k, v in metrics.items()}


def _sort(rows: list[dict], sort: str, order: str) -> list[dict]:
    if sort == "name":
        return sorted(rows, key=lambda r: r["name"].lower(), reverse=order == "desc")
    return sort_nulls_last(rows, lambda r: r["metrics"].get(sort), descending=order == "desc", tiebreak=lambda r: r["id"])


def _scoped(stmt, scope: Scope, model):
    """Restrict an entity query to the scope. ``model`` must have client_id and campaign_id or be Campaign."""
    if scope.client_ids is not None:
        stmt = stmt.where(model.client_id.in_(scope.client_ids))
    if scope.platform:
        stmt = stmt.where(AdAccount.platform == scope.platform)
    if scope.result_type:
        stmt = stmt.where(Campaign.primary_conversion_type == scope.result_type)
    if scope.campaign_id is not None:
        stmt = stmt.where(Campaign.id == scope.campaign_id)
    return stmt


# --------------------------------------------------------------------------- summaries


def summary(db: Session, scope: Scope, period: Period) -> dict[str, Any]:
    currency, cur_reason, n_cur = _currency(db, scope)
    reason = _no_data_reason(scope, n_cur)
    cur = M.compute_metrics(total(db, scope, period), currency_reason=cur_reason, no_data_reason=reason)
    prev_period = period.previous()
    prev = M.compute_metrics(total(db, scope, prev_period), currency_reason=cur_reason, no_data_reason=reason)
    return {
        "period": period.to_dict(),
        "previous_period": prev_period.to_dict(),
        "currency": currency,
        "metrics": M.with_comparison(cur, prev),
    }


def timeseries(db: Session, scope: Scope, period: Period) -> dict[str, Any]:
    currency, cur_reason, _ = _currency(db, scope)
    by_day = aggregate(db, scope, period, ("date",))
    lo, hi = data_bounds(db, scope)
    period_types = set()
    for t in by_day.values():
        period_types.update(t.results.keys())

    points = []
    for d in period.iter_days():
        t = by_day.get(d)
        covered = lo is not None and lo <= d <= hi
        if t is None and covered:
            # Inside the synced range with no delivery rows: the ads genuinely did not deliver.
            t = Totals(rows=1, reach=0, results={rt: ResultTotals() for rt in period_types})
        values = _values(M.compute_metrics(t or Totals(), currency_reason=cur_reason))
        points.append({"date": d.isoformat(), "has_data": t is not None, **values})
    return {
        "period": period.to_dict(),
        "currency": currency,
        "data_from": lo.isoformat() if lo else None,
        "data_through": hi.isoformat() if hi else None,
        "points": points,
    }


# --------------------------------------------------------------------------- clients


def _account_dict(a: AdAccount, data_through) -> dict[str, Any]:
    return {
        "id": a.id,
        "platform": a.platform,
        "platform_label": PLATFORMS.get(a.platform, {}).get("label", a.platform),
        "external_id": a.external_id,
        "name": a.name,
        "currency": a.currency,
        "timezone": a.timezone,
        "connection_status": a.connection_status,
        "last_synced_at": a.last_synced_at.isoformat() if a.last_synced_at else None,
        "data_through": data_through.isoformat() if data_through else None,
    }


def client_profile(db: Session, client: Client) -> dict[str, Any]:
    accounts = []
    for a in client.ad_accounts:
        _, hi = _account_bounds(db, a)
        accounts.append(_account_dict(a, hi))
    synced = [a.last_synced_at for a in client.ad_accounts if a.last_synced_at]
    return {
        "id": client.id,
        "slug": client.slug,
        "name": client.name,
        "category": client.category,
        "industry": client.industry,
        "geography": client.geography,
        "is_demo": client.is_demo,
        "ad_accounts": accounts,
        "last_successful_sync": max(synced).isoformat() if synced else None,
    }


def _account_bounds(db: Session, account: AdAccount):
    stmt = (
        select(func.min(DailyAdMetric.date), func.max(DailyAdMetric.date))
        .join(Ad, Ad.id == DailyAdMetric.ad_id)
        .join(Campaign, Campaign.id == Ad.campaign_id)
        .where(Campaign.ad_account_id == account.id, DailyAdMetric.client_id == account.client_id)
    )
    return db.execute(stmt).one()


def client_cards(db: Session, clients: list[Client], period: Period, platform: str | None) -> list[dict[str, Any]]:
    ids = tuple(c.id for c in clients)
    scope = Scope(client_ids=ids, platform=platform)
    cur = aggregate(db, scope, period, ("client",))
    prev = aggregate(db, scope, period.previous(), ("client",))
    daily = aggregate(db, scope, period, ("client", "date"))

    spark: dict[int, dict] = defaultdict(dict)
    for (cid, d), t in daily.items():
        spark[cid][d] = t.spend

    cards = []
    for c in clients:
        cscope = Scope(client_ids=(c.id,), platform=platform)
        currency, cur_reason, n_cur = _currency(db, cscope)
        reason = _no_data_reason(cscope, n_cur)
        m_cur = M.compute_metrics(cur.get(c.id, Totals()), currency_reason=cur_reason, no_data_reason=reason)
        m_prev = M.compute_metrics(prev.get(c.id, Totals()), currency_reason=cur_reason, no_data_reason=reason)
        compared = M.with_comparison(m_cur, m_prev)
        t = cur.get(c.id, Totals())
        primary = max(t.results.items(), key=lambda kv: kv[1].spend)[0] if t.results else None
        profile = client_profile(db, c)
        accounts = [a for a in profile["ad_accounts"] if not platform or a["platform"] == platform]
        cards.append({
            **{k: profile[k] for k in ("id", "slug", "name", "category", "geography", "is_demo")},
            "ad_accounts": accounts,
            "connection_status": _overall_status(accounts),
            "currency": currency,
            "primary_result_type": primary,
            "metrics": {k: compared[k] for k in (
                "spend", "leads", "cost_per_lead", "purchases", "cost_per_purchase", "purchase_value", "roas"
            )},
            "sparkline": [
                {"date": d.isoformat(), "spend": spark[c.id].get(d)} for d in period.iter_days()
            ] if t.rows else [],
        })
    return cards


def _overall_status(accounts: list[dict]) -> str:
    if not accounts:
        return "not_connected"
    statuses = {a["connection_status"] for a in accounts}
    for s in ("error", "expired"):
        if s in statuses:
            return s
    if statuses == {"demo"}:
        return "demo"
    return "connected" if "connected" in statuses else next(iter(statuses))


# --------------------------------------------------------------------------- entity tables


def _campaign_info(c: Campaign, client_name: str | None) -> dict[str, Any]:
    cat = objective_category(c.ad_account.platform, c.objective)
    return {
        "id": c.id,
        "external_id": c.external_id,
        "name": c.name,
        "objective": c.objective,
        "objective_category": cat,
        "objective_label": OBJECTIVE_CATEGORIES[cat]["label"],
        "status": c.status,
        "platform": c.ad_account.platform,
        "client_id": c.client_id,
        "client_name": client_name,
    }


def _client_names(db: Session, scope: Scope) -> dict[int, str]:
    stmt = select(Client.id, Client.name)
    if scope.client_ids is not None:
        stmt = stmt.where(Client.id.in_(scope.client_ids))
    return dict(db.execute(stmt).all())


def campaign_rows(db: Session, scope: Scope, period: Period, sort: str = "spend", order: str = "desc") -> list[dict]:
    stmt = select(Campaign).join(AdAccount, AdAccount.id == Campaign.ad_account_id).options(
        joinedload(Campaign.ad_account)
    )
    campaigns = db.execute(_scoped(stmt, scope, Campaign)).scalars().all()
    totals = aggregate(db, scope, period, ("campaign",))
    names = _client_names(db, scope)
    rows = []
    for c in campaigns:
        rows.append({
            **_campaign_info(c, names.get(c.client_id)),
            "metrics": M.entity_summary(totals.get(c.id, Totals()), c.primary_conversion_type),
        })
    return _sort(rows, sort, order)


def ad_set_rows(db: Session, scope: Scope, period: Period, sort: str = "spend", order: str = "desc") -> list[dict]:
    stmt = (
        select(AdSet)
        .join(Campaign, Campaign.id == AdSet.campaign_id)
        .join(AdAccount, AdAccount.id == Campaign.ad_account_id)
        .options(joinedload(AdSet.campaign).joinedload(Campaign.ad_account))
    )
    ad_sets = db.execute(_scoped(stmt, scope, AdSet)).scalars().all()
    totals = aggregate(db, scope, period, ("ad_set",))
    rows = []
    for s in ad_sets:
        rows.append({
            "id": s.id,
            "external_id": s.external_id,
            "name": s.name,
            "status": s.status,
            "optimization_goal": s.optimization_goal,
            "campaign": {"id": s.campaign.id, "name": s.campaign.name},
            "metrics": M.entity_summary(totals.get(s.id, Totals()), s.campaign.primary_conversion_type),
        })
    return _sort(rows, sort, order)


def _ad_query(scope: Scope):
    stmt = (
        select(Ad)
        .join(Campaign, Campaign.id == Ad.campaign_id)
        .join(AdAccount, AdAccount.id == Campaign.ad_account_id)
        .outerjoin(Creative, Creative.id == Ad.creative_id)
        .options(
            joinedload(Ad.campaign).joinedload(Campaign.ad_account),
            joinedload(Ad.ad_set),
            joinedload(Ad.creative),
        )
    )
    stmt = _scoped(stmt, scope, Ad)
    if scope.ad_set_id is not None:
        stmt = stmt.where(Ad.ad_set_id == scope.ad_set_id)
    if scope.ad_id is not None:
        stmt = stmt.where(Ad.id == scope.ad_id)
    if scope.format:
        stmt = stmt.where(func.coalesce(Creative.format, "unknown") == scope.format)
    return stmt


def _creative_dict(cr: Creative | None) -> dict[str, Any]:
    if cr is None:
        return {"format": "unknown", "format_label": "Unknown", "aspect_ratio": None, "is_vertical_video": None,
                "thumbnail_url": None, "headline": None, "body": None, "call_to_action": None}
    return {
        "id": cr.id,
        "external_id": cr.external_id,
        "format": cr.format,
        "format_label": FORMAT_LABELS.get(cr.format, cr.format.capitalize()),
        "aspect_ratio": cr.aspect_ratio,
        "is_vertical_video": cr.is_vertical_video,
        "thumbnail_url": cr.thumbnail_url,
        "headline": cr.headline,
        "body": cr.body,
        "call_to_action": cr.call_to_action,
    }


def _ad_dict(ad: Ad, metrics: dict[str, Any], client_name: str | None) -> dict[str, Any]:
    return {
        "id": ad.id,
        "external_id": ad.external_id,
        "name": ad.name,
        "status": ad.status,
        "client_id": ad.client_id,
        "client_name": client_name,
        "campaign": _campaign_info(ad.campaign, client_name),
        "ad_set": {"id": ad.ad_set.id, "name": ad.ad_set.name},
        "creative": _creative_dict(ad.creative),
        "placements": ad.placements,
        "metrics": metrics,
    }


def ad_rows(db: Session, scope: Scope, period: Period, sort: str = "spend", order: str = "desc") -> list[dict]:
    ads = db.execute(_ad_query(scope)).unique().scalars().all()
    totals = aggregate(db, scope, period, ("ad",))
    names = _client_names(db, scope)
    rows = [
        _ad_dict(a, M.entity_summary(totals.get(a.id, Totals()), a.campaign.primary_conversion_type),
                 names.get(a.client_id))
        for a in ads
    ]
    return _sort(rows, sort, order)


def ad_detail(db: Session, client: Client, ad: Ad, period: Period) -> dict[str, Any]:
    scope = Scope(client_ids=(client.id,), ad_id=ad.id)
    primary = ad.campaign.primary_conversion_type
    cur = M.entity_summary(total(db, scope, period), primary)
    prev = M.entity_summary(total(db, scope, period.previous()), primary)

    camp_scope = Scope(client_ids=(client.id,), campaign_id=ad.campaign_id)
    camp_ads = ad_rows(db, camp_scope, period, sort="results" if primary else "spend")
    camp_total = M.entity_summary(total(db, camp_scope, period), primary)
    return {
        **_ad_dict(ad, cur, client.name),
        "previous_metrics": prev,
        "previous_period": period.previous().to_dict(),
        "timeseries": timeseries(db, scope, period)["points"],
        "campaign_context": {
            "metrics": camp_total,
            "spend_share": M.safe_div(cur["spend"], camp_total["spend"]),
            "ads_in_campaign": len(camp_ads),
            "rank_in_campaign": next((i + 1 for i, r in enumerate(camp_ads) if r["id"] == ad.id), None),
            "rank_basis": "results" if primary else "spend",
        },
    }


# --------------------------------------------------------------------------- formats


def format_rows(db: Session, scope: Scope, period: Period) -> dict[str, Any]:
    currency, cur_reason, _ = _currency(db, scope)
    by_format = aggregate(db, scope, period, ("format",))
    ad_counts: dict[str, int] = defaultdict(int)
    for (fmt, _ad) in aggregate(db, scope, period, ("format", "ad")):
        ad_counts[fmt] += 1
    overall_spend = sum(t.spend for t in by_format.values())
    rows = []
    for fmt in sorted(by_format, key=lambda f: -by_format[f].spend):
        t = by_format[fmt]
        rows.append({
            "format": fmt,
            "label": FORMAT_LABELS.get(fmt, fmt.capitalize()),
            "ad_count": ad_counts[fmt],
            "spend_share": None if cur_reason else M.safe_div(t.spend, overall_spend),
            "metrics": _values(M.compute_metrics(t, currency_reason=cur_reason)),
        })
    return {
        "period": period.to_dict(),
        "currency": currency,
        "note": "Creative format describes the asset (image, video, carousel). It is independent of placement: "
        "one video can deliver in Feed, Stories and Reels.",
        "rows": rows,
    }


# --------------------------------------------------------------------------- analysis


def _ad_perfs(db: Session, scope: Scope, period: Period) -> list[AdPerf]:
    out = []
    for r in ad_rows(db, scope, period):
        if not r["metrics"]["has_data"]:
            continue
        out.append(AdPerf(
            ad_id=r["id"],
            name=r["name"],
            campaign_name=r["campaign"]["name"],
            objective_category=r["campaign"]["objective_category"],
            format=r["creative"]["format"],
            m=r["metrics"],
        ))
    return out


def rankings(db: Session, scope: Scope, period: Period, th: Thresholds) -> dict[str, Any]:
    _, cur_reason, _ = _currency(db, scope)
    if cur_reason:
        return {"period": period.to_dict(), "unavailable_reason": cur_reason, "rankings": [],
                "needs_more_data": {"criteria": "", "entries": []}}
    return {"period": period.to_dict(), **rank_ads(_ad_perfs(db, scope, period), th)}


def insights(db: Session, scope: Scope, period: Period, th: Thresholds) -> dict[str, Any]:
    _, cur_reason, _ = _currency(db, scope)
    if cur_reason:
        return {"period": period.to_dict(), "unavailable_reason": cur_reason, "insights": []}
    items: list[dict] = []

    ranked = rank_ads(_ad_perfs(db, scope, period), th)
    items += I.ranking_highlights(ranked)

    camps = [
        I.CampaignPerf(r["id"], r["name"], r["metrics"])
        for r in campaign_rows(db, scope, period)
        if r["metrics"]["has_data"]
    ]
    items += I.budget_without_results(camps, th)

    halves = period.halves()
    if halves:
        first = {a.ad_id: a for a in _ad_perfs(db, scope, halves[0])}
        second = {a.ad_id: a for a in _ad_perfs(db, scope, halves[1])}
        items += I.declining_efficiency(first, second, th)

    by_format: dict[str, dict[str, Any]] = {}
    overall: dict[str, dict[str, float]] = {}
    for fmt, t in aggregate(db, scope, period, ("format",)).items():
        for rtype, r in t.results.items():
            by_format.setdefault(fmt, {})[rtype] = {"spend": r.spend, "results": r.count}
            o = overall.setdefault(rtype, {"spend": 0.0, "results": 0})
            o["spend"] += r.spend
            o["results"] += r.count
    items += I.formats_worth_testing(by_format, overall, th)

    order = {"warning": 0, "positive": 1, "info": 2}
    items.sort(key=lambda i: order.get(i["severity"], 3))
    return {
        "period": period.to_dict(),
        "thresholds": ranked["thresholds"],
        "basis_note": "Calculated from stored metrics with fixed rules. No AI-generated text.",
        "insights": items,
    }


# --------------------------------------------------------------------------- search


def _like(q: str) -> str:
    escaped = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def search(db: Session, q: str, client_ids: tuple[int, ...] | None, limit: int = 5) -> dict[str, list]:
    pat = _like(q)
    cstmt = select(Client).where(or_(Client.name.ilike(pat, escape="\\"), Client.category.ilike(pat, escape="\\")))
    if client_ids is not None:
        cstmt = cstmt.where(Client.id.in_(client_ids))
    clients = db.execute(cstmt.order_by(Client.name).limit(limit)).scalars().all()

    names = dict(db.execute(select(Client.id, Client.name)).all())

    kstmt = select(Campaign).where(
        or_(Campaign.name.ilike(pat, escape="\\"), Campaign.external_id.ilike(pat, escape="\\"))
    )
    if client_ids is not None:
        kstmt = kstmt.where(Campaign.client_id.in_(client_ids))
    campaigns = db.execute(kstmt.order_by(Campaign.name).limit(limit)).scalars().all()

    astmt = select(Ad).where(or_(Ad.name.ilike(pat, escape="\\"), Ad.external_id.ilike(pat, escape="\\")))
    if client_ids is not None:
        astmt = astmt.where(Ad.client_id.in_(client_ids))
    ads = db.execute(astmt.order_by(Ad.name).limit(limit)).scalars().all()

    return {
        "clients": [{"id": c.id, "name": c.name, "category": c.category} for c in clients],
        "campaigns": [
            {"id": c.id, "name": c.name, "external_id": c.external_id, "client_id": c.client_id,
             "client_name": names.get(c.client_id)} for c in campaigns
        ],
        "ads": [
            {"id": a.id, "name": a.name, "external_id": a.external_id, "client_id": a.client_id,
             "client_name": names.get(a.client_id), "campaign_id": a.campaign_id} for a in ads
        ],
    }
