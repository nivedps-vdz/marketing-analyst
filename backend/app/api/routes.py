"""HTTP routes. All endpoints are read-only (GET) in Phase 1."""

from typing import Annotated, Any

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.api.deps import (
    AccessibleDep,
    ClientDep,
    DbDep,
    FormatParam,
    OrderParam,
    PeriodDep,
    PlatformDep,
    ResultTypeParam,
    SettingsDep,
    SortParam,
    ThresholdsDep,
    require_ad,
    require_ad_set,
    require_campaign,
    today,
)
from app.analytics.periods import Period, default_period
from app.models import Client, DailyAdMetric
from app.platforms import PLATFORMS
from app.services import reporting as R
from app.services.aggregation import DEFAULT_ATTRIBUTION, Scope

router = APIRouter(prefix="/api")


def envelope(settings, **payload: Any) -> dict[str, Any]:
    """Every response states whether it contains synthetic data."""
    return {"data_source": settings.data_mode, **payload}


def _client_filter(allowed: tuple[int, ...], client_ids: list[int] | None) -> tuple[int, ...]:
    """Intersect a requested client filter with the clients the user may see. Unknown IDs are dropped."""
    if not client_ids:
        return allowed
    return tuple(c for c in allowed if c in set(client_ids))


@router.get("/health")
def health(settings: SettingsDep) -> dict:
    return envelope(settings, status="ok")


@router.get("/meta")
def meta(db: DbDep, settings: SettingsDep) -> dict:
    lo, hi = db.execute(select(func.min(DailyAdMetric.date), func.max(DailyAdMetric.date))).one()
    t = today(settings)
    default = default_period(t)
    if hi is not None and hi < default.end:
        # Demo data may have been generated a few days ago; anchor the default range on the latest data.
        default = Period(hi - (default.end - default.start), hi)
    return envelope(
        settings,
        today=t.isoformat(),
        timezone=settings.reporting_timezone,
        data_from=lo.isoformat() if lo else None,
        data_through=hi.isoformat() if hi else None,
        default_period=default.to_dict(),
        platforms=[{"id": k, **v} for k, v in PLATFORMS.items()],
        attribution_setting=DEFAULT_ATTRIBUTION,
        thresholds={
            "min_spend": settings.min_spend,
            "min_impressions": settings.min_impressions,
            "min_conversions": settings.min_conversions,
        },
    )


@router.get("/search")
def search(
    db: DbDep, settings: SettingsDep, allowed: AccessibleDep,
    q: Annotated[str, Query(min_length=2, max_length=100)],
) -> dict:
    return envelope(settings, query=q, **R.search(db, q.strip(), allowed))


# ----------------------------------------------------------------------- all-client overview


@router.get("/overview/summary")
def overview_summary(
    db: DbDep, settings: SettingsDep, allowed: AccessibleDep, period: PeriodDep, platform: PlatformDep,
    client_ids: Annotated[list[int] | None, Query()] = None,
) -> dict:
    scope = Scope(client_ids=_client_filter(allowed, client_ids), platform=platform)
    return envelope(settings, **R.summary(db, scope, period))


@router.get("/overview/timeseries")
def overview_timeseries(
    db: DbDep, settings: SettingsDep, allowed: AccessibleDep, period: PeriodDep, platform: PlatformDep,
    client_ids: Annotated[list[int] | None, Query()] = None,
) -> dict:
    scope = Scope(client_ids=_client_filter(allowed, client_ids), platform=platform)
    return envelope(settings, **R.timeseries(db, scope, period))


@router.get("/overview/clients")
def overview_clients(
    db: DbDep, settings: SettingsDep, allowed: AccessibleDep, period: PeriodDep, platform: PlatformDep,
) -> dict:
    clients = db.execute(select(Client).where(Client.id.in_(allowed)).order_by(Client.name)).scalars().all()
    return envelope(settings, period=period.to_dict(), clients=R.client_cards(db, list(clients), period, platform))


@router.get("/overview/campaign-ranking")
def overview_campaign_ranking(
    db: DbDep, settings: SettingsDep, allowed: AccessibleDep, period: PeriodDep, platform: PlatformDep,
    sort: SortParam = "spend", order: OrderParam = "desc",
    result_type: ResultTypeParam | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
) -> dict:
    scope = Scope(client_ids=allowed, platform=platform, result_type=result_type)
    rows = [r for r in R.campaign_rows(db, scope, period, sort, order) if r["metrics"]["has_data"]]
    return envelope(settings, period=period.to_dict(), sort=sort, order=order, result_type=result_type,
                    campaigns=rows[:limit], total=len(rows))


@router.get("/overview/formats")
def overview_formats(
    db: DbDep, settings: SettingsDep, allowed: AccessibleDep, period: PeriodDep, platform: PlatformDep,
    client_ids: Annotated[list[int] | None, Query()] = None,
) -> dict:
    scope = Scope(client_ids=_client_filter(allowed, client_ids), platform=platform)
    return envelope(settings, **R.format_rows(db, scope, period))


@router.get("/campaigns")
def all_campaigns(
    db: DbDep, settings: SettingsDep, allowed: AccessibleDep, period: PeriodDep, platform: PlatformDep,
    client_ids: Annotated[list[int] | None, Query()] = None,
    sort: SortParam = "spend", order: OrderParam = "desc", result_type: ResultTypeParam | None = None,
) -> dict:
    scope = Scope(client_ids=_client_filter(allowed, client_ids), platform=platform, result_type=result_type)
    return envelope(settings, period=period.to_dict(), campaigns=R.campaign_rows(db, scope, period, sort, order))


@router.get("/ads")
def all_ads(
    db: DbDep, settings: SettingsDep, allowed: AccessibleDep, period: PeriodDep, platform: PlatformDep,
    client_ids: Annotated[list[int] | None, Query()] = None,
    format: FormatParam | None = None, result_type: ResultTypeParam | None = None,
    sort: SortParam = "spend", order: OrderParam = "desc",
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
) -> dict:
    scope = Scope(client_ids=_client_filter(allowed, client_ids), platform=platform, format=format,
                  result_type=result_type)
    rows = R.ad_rows(db, scope, period, sort, order)
    return envelope(settings, period=period.to_dict(), ads=rows[:limit], total=len(rows))


# ----------------------------------------------------------------------- client-scoped


def _client_scope(
    db, client, platform, campaign_id=None, ad_set_id=None, format=None, result_type=None
) -> Scope:
    return Scope(
        client_ids=(client.id,),
        platform=platform,
        campaign_id=require_campaign(db, client, campaign_id),
        ad_set_id=require_ad_set(db, client, ad_set_id),
        format=format,
        result_type=result_type,
    )


@router.get("/clients")
def list_clients(db: DbDep, settings: SettingsDep, allowed: AccessibleDep) -> dict:
    clients = db.execute(select(Client).where(Client.id.in_(allowed)).order_by(Client.name)).scalars().all()
    return envelope(settings, clients=[R.client_profile(db, c) for c in clients])


@router.get("/clients/{client_id}")
def get_client(db: DbDep, settings: SettingsDep, client: ClientDep) -> dict:
    return envelope(settings, client=R.client_profile(db, client))


@router.get("/clients/{client_id}/summary")
def client_summary(
    db: DbDep, settings: SettingsDep, client: ClientDep, period: PeriodDep, platform: PlatformDep,
    campaign_id: int | None = None, format: FormatParam | None = None,
) -> dict:
    scope = _client_scope(db, client, platform, campaign_id, format=format)
    return envelope(settings, client_id=client.id, **R.summary(db, scope, period))


@router.get("/clients/{client_id}/timeseries")
def client_timeseries(
    db: DbDep, settings: SettingsDep, client: ClientDep, period: PeriodDep, platform: PlatformDep,
    campaign_id: int | None = None, format: FormatParam | None = None,
) -> dict:
    scope = _client_scope(db, client, platform, campaign_id, format=format)
    return envelope(settings, client_id=client.id, **R.timeseries(db, scope, period))


@router.get("/clients/{client_id}/formats")
def client_formats(
    db: DbDep, settings: SettingsDep, client: ClientDep, period: PeriodDep, platform: PlatformDep,
    campaign_id: int | None = None,
) -> dict:
    scope = _client_scope(db, client, platform, campaign_id)
    return envelope(settings, client_id=client.id, **R.format_rows(db, scope, period))


@router.get("/clients/{client_id}/campaigns")
def client_campaigns(
    db: DbDep, settings: SettingsDep, client: ClientDep, period: PeriodDep, platform: PlatformDep,
    format: FormatParam | None = None, sort: SortParam = "spend", order: OrderParam = "desc",
) -> dict:
    scope = _client_scope(db, client, platform, format=format)
    return envelope(settings, client_id=client.id, period=period.to_dict(),
                    campaigns=R.campaign_rows(db, scope, period, sort, order))


@router.get("/clients/{client_id}/adsets")
def client_ad_sets(
    db: DbDep, settings: SettingsDep, client: ClientDep, period: PeriodDep, platform: PlatformDep,
    campaign_id: int | None = None, format: FormatParam | None = None,
    sort: SortParam = "spend", order: OrderParam = "desc",
) -> dict:
    scope = _client_scope(db, client, platform, campaign_id, format=format)
    return envelope(settings, client_id=client.id, period=period.to_dict(),
                    ad_sets=R.ad_set_rows(db, scope, period, sort, order))


@router.get("/clients/{client_id}/ads")
def client_ads(
    db: DbDep, settings: SettingsDep, client: ClientDep, period: PeriodDep, platform: PlatformDep,
    campaign_id: int | None = None, ad_set_id: int | None = None,
    format: FormatParam | None = None, result_type: ResultTypeParam | None = None,
    sort: SortParam = "spend", order: OrderParam = "desc",
) -> dict:
    scope = _client_scope(db, client, platform, campaign_id, ad_set_id, format, result_type)
    return envelope(settings, client_id=client.id, period=period.to_dict(),
                    ads=R.ad_rows(db, scope, period, sort, order))


@router.get("/clients/{client_id}/ads/{ad_id}")
def client_ad_detail(db: DbDep, settings: SettingsDep, client: ClientDep, period: PeriodDep, ad_id: int) -> dict:
    ad = require_ad(db, client, ad_id)
    return envelope(settings, client_id=client.id, period=period.to_dict(),
                    ad=R.ad_detail(db, client, ad, period))


@router.get("/clients/{client_id}/rankings")
def client_rankings(
    db: DbDep, settings: SettingsDep, client: ClientDep, period: PeriodDep, platform: PlatformDep,
    th: ThresholdsDep, campaign_id: int | None = None, format: FormatParam | None = None,
) -> dict:
    scope = _client_scope(db, client, platform, campaign_id, format=format)
    return envelope(settings, client_id=client.id, **R.rankings(db, scope, period, th))


@router.get("/clients/{client_id}/insights")
def client_insights(
    db: DbDep, settings: SettingsDep, client: ClientDep, period: PeriodDep, platform: PlatformDep,
    th: ThresholdsDep, campaign_id: int | None = None,
) -> dict:
    scope = _client_scope(db, client, platform, campaign_id)
    return envelope(settings, client_id=client.id, **R.insights(db, scope, period, th))
