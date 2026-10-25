"""SQL aggregation of base metrics into ``Totals``.

All queries sum base metrics only (spend, impressions, clicks, conversions). Ratios are computed afterwards
in ``app.analytics.metrics``. Every query is restricted by ``Scope``; ``client_ids`` is applied to every
row so data from other clients can never leak into a result.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.analytics.metrics import Totals
from app.analytics.periods import Period
from app.models import Ad, AdAccount, Campaign, Creative, DailyAdConversion, DailyAdMetric

# Meta's default attribution setting. Conversions under other settings are never mixed into these totals.
DEFAULT_ATTRIBUTION = "7d_click_1d_view"

GROUPS = ("date", "client", "campaign", "ad_set", "ad", "format")


@dataclass(frozen=True)
class Scope:
    client_ids: tuple[int, ...] | None = None  # None = every client the caller may see
    platform: str | None = None
    campaign_id: int | None = None
    ad_set_id: int | None = None
    ad_id: int | None = None
    format: str | None = None
    result_type: str | None = None  # restrict to campaigns optimising for this conversion type
    attribution: str = DEFAULT_ATTRIBUTION


def _group_col(name: str, date_col):
    return {
        "date": date_col,
        "client": Ad.client_id,
        "campaign": Ad.campaign_id,
        "ad_set": Ad.ad_set_id,
        "ad": Ad.id,
        "format": func.coalesce(Creative.format, "unknown"),
    }[name]


def _apply_scope(stmt, scope: Scope, client_col):
    if scope.client_ids is not None:
        stmt = stmt.where(client_col.in_(scope.client_ids), Ad.client_id.in_(scope.client_ids))
    if scope.platform:
        stmt = stmt.where(AdAccount.platform == scope.platform)
    if scope.campaign_id is not None:
        stmt = stmt.where(Ad.campaign_id == scope.campaign_id)
    if scope.ad_set_id is not None:
        stmt = stmt.where(Ad.ad_set_id == scope.ad_set_id)
    if scope.ad_id is not None:
        stmt = stmt.where(Ad.id == scope.ad_id)
    if scope.format:
        stmt = stmt.where(func.coalesce(Creative.format, "unknown") == scope.format)
    if scope.result_type:
        stmt = stmt.where(Campaign.primary_conversion_type == scope.result_type)
    return stmt


def _joins(stmt, fact):
    return (
        stmt.select_from(fact)
        .join(Ad, Ad.id == fact.ad_id)
        .join(Campaign, Campaign.id == Ad.campaign_id)
        .join(AdAccount, AdAccount.id == Campaign.ad_account_id)
        .outerjoin(Creative, Creative.id == Ad.creative_id)
    )


def aggregate(db: Session, scope: Scope, period: Period, group_by: tuple[str, ...] = ()) -> dict[Any, Totals]:
    """Return ``{group_key: Totals}``. With no ``group_by`` the single key is ``None``.

    Group keys are scalars for one grouping column, tuples for several.
    """
    for g in group_by:
        if g not in GROUPS:
            raise ValueError(f"unknown group {g}")

    def key_of(row, n: int):
        vals = tuple(row[:n])
        if n == 0:
            return None
        return vals[0] if n == 1 else vals

    n = len(group_by)
    out: dict[Any, Totals] = {}

    m_groups = [_group_col(g, DailyAdMetric.date) for g in group_by]
    m_stmt = _joins(
        select(
            *m_groups,
            Campaign.primary_conversion_type,
            func.sum(DailyAdMetric.spend),
            func.sum(DailyAdMetric.impressions),
            func.sum(DailyAdMetric.reach),
            func.sum(DailyAdMetric.clicks),
            func.count(DailyAdMetric.id),
        ),
        DailyAdMetric,
    ).where(DailyAdMetric.date >= period.start, DailyAdMetric.date <= period.end)
    m_stmt = _apply_scope(m_stmt, scope, DailyAdMetric.client_id)
    m_stmt = m_stmt.group_by(*m_groups, Campaign.primary_conversion_type)

    for row in db.execute(m_stmt).all():
        primary, spend, impressions, reach, clicks, rows = row[n:]
        t = out.setdefault(key_of(row, n), Totals())
        t.add_delivery(
            spend=float(spend or 0),
            impressions=int(impressions or 0),
            reach=None if reach is None else int(reach),
            clicks=int(clicks or 0),
            primary_type=primary,
            rows=int(rows),
        )

    c_groups = [_group_col(g, DailyAdConversion.date) for g in group_by]
    c_stmt = _joins(
        select(
            *c_groups,
            DailyAdConversion.conversion_type,
            func.sum(DailyAdConversion.count),
            func.sum(DailyAdConversion.value),
        ),
        DailyAdConversion,
    ).where(
        DailyAdConversion.date >= period.start,
        DailyAdConversion.date <= period.end,
        DailyAdConversion.attribution_setting == scope.attribution,
        # Only conversions that are the campaign's own result type count as results.
        DailyAdConversion.conversion_type == Campaign.primary_conversion_type,
    )
    c_stmt = _apply_scope(c_stmt, scope, DailyAdConversion.client_id)
    c_stmt = c_stmt.group_by(*c_groups, DailyAdConversion.conversion_type)

    for row in db.execute(c_stmt).all():
        ctype, count, value = row[n:]
        t = out.setdefault(key_of(row, n), Totals())
        t.add_conversions(ctype, int(count or 0), None if value is None else float(value))

    return out


def total(db: Session, scope: Scope, period: Period) -> Totals:
    return aggregate(db, scope, period).get(None, Totals())


def currencies(db: Session, scope: Scope) -> set[str]:
    stmt = select(AdAccount.currency).distinct()
    if scope.client_ids is not None:
        stmt = stmt.where(AdAccount.client_id.in_(scope.client_ids))
    if scope.platform:
        stmt = stmt.where(AdAccount.platform == scope.platform)
    return {c for (c,) in db.execute(stmt).all()}


def data_bounds(db: Session, scope: Scope) -> tuple[date | None, date | None]:
    """First and last date with delivery data in scope, ignoring the reporting period."""
    stmt = _joins(select(func.min(DailyAdMetric.date), func.max(DailyAdMetric.date)), DailyAdMetric)
    stmt = _apply_scope(stmt, scope, DailyAdMetric.client_id)
    lo, hi = db.execute(stmt).one()
    return lo, hi
