"""Shared request dependencies: reporting period, filters and client scoping."""

from datetime import date, datetime
from typing import Annotated, Literal
from zoneinfo import ZoneInfo

from fastapi import Depends, HTTPException, Path, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.analytics.periods import Period, PeriodError, default_period
from app.analytics.rankings import Thresholds
from app.config import Settings, get_settings
from app.db.session import get_db
from app.models import Ad, AdSet, Campaign, Client
from app.platforms import PLATFORMS

DbDep = Annotated[Session, Depends(get_db)]
SettingsDep = Annotated[Settings, Depends(get_settings)]

FormatParam = Literal["image", "video", "carousel", "other", "unknown"]
ResultTypeParam = Literal["lead", "purchase"]
SortParam = Literal["name", "spend", "impressions", "clicks", "ctr", "cpc", "cpm", "results", "cpa", "roas"]
OrderParam = Literal["asc", "desc"]


def today(settings: Settings) -> date:
    return datetime.now(ZoneInfo(settings.reporting_timezone)).date()


def get_period(
    settings: SettingsDep,
    start: Annotated[date | None, Query(description="Inclusive start date (YYYY-MM-DD)")] = None,
    end: Annotated[date | None, Query(description="Inclusive end date (YYYY-MM-DD)")] = None,
) -> Period:
    if (start is None) != (end is None):
        raise HTTPException(422, "Provide both start and end, or neither")
    try:
        if start is None:
            return default_period(today(settings))
        return Period(start, end)
    except PeriodError as e:
        raise HTTPException(422, str(e)) from e


PeriodDep = Annotated[Period, Depends(get_period)]


def get_platform(platform: Annotated[str | None, Query()] = None) -> str | None:
    if platform in (None, "", "all"):
        return None
    if platform not in PLATFORMS:
        raise HTTPException(422, f"Unknown platform '{platform}'")
    return platform


PlatformDep = Annotated[str | None, Depends(get_platform)]


def get_thresholds(settings: SettingsDep) -> Thresholds:
    return Thresholds(settings.min_spend, settings.min_impressions, settings.min_conversions)


ThresholdsDep = Annotated[Thresholds, Depends(get_thresholds)]


def accessible_client_ids(db: DbDep) -> tuple[int, ...]:
    """Clients the current user may see.

    Phase 1 runs locally for a single Vestadz user who can see every client. This function is the single
    place to add per-user grants when the app is hosted.
    """
    return tuple(db.execute(select(Client.id)).scalars().all())


AccessibleDep = Annotated[tuple[int, ...], Depends(accessible_client_ids)]


def get_scoped_client(
    db: DbDep, allowed: AccessibleDep, client_id: Annotated[int, Path(ge=1)]
) -> Client:
    if client_id not in allowed:
        raise HTTPException(404, "Client not found")
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(404, "Client not found")
    return client


ClientDep = Annotated[Client, Depends(get_scoped_client)]


def require_campaign(db: Session, client: Client, campaign_id: int | None) -> int | None:
    """Validate that a campaign filter belongs to the client. Cross-client IDs return 404."""
    if campaign_id is None:
        return None
    found = db.execute(
        select(Campaign.id).where(Campaign.id == campaign_id, Campaign.client_id == client.id)
    ).scalar_one_or_none()
    if found is None:
        raise HTTPException(404, "Campaign not found for this client")
    return campaign_id


def require_ad_set(db: Session, client: Client, ad_set_id: int | None) -> int | None:
    if ad_set_id is None:
        return None
    found = db.execute(
        select(AdSet.id).where(AdSet.id == ad_set_id, AdSet.client_id == client.id)
    ).scalar_one_or_none()
    if found is None:
        raise HTTPException(404, "Ad set not found for this client")
    return ad_set_id


def require_ad(db: Session, client: Client, ad_id: int) -> Ad:
    ad = db.execute(select(Ad).where(Ad.id == ad_id, Ad.client_id == client.id)).scalar_one_or_none()
    if ad is None:
        raise HTTPException(404, "Ad not found for this client")
    return ad
