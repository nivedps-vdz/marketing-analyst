"""Interface every advertising platform adapter implements (Meta in Phase 2, Google Ads in Phase 6).

Adapters translate platform responses into the normalized records below. Shared analytics code only reads
the normalized tables, so adding a platform does not change analytics, API or UI code.
Adapters are read-only: they must never create, pause, modify or delete live ads.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Protocol


@dataclass
class AccountRecord:
    external_id: str
    name: str
    currency: str
    timezone: str


@dataclass
class EntityRecord:
    level: str  # "campaign" | "ad_set" | "ad" | "creative"
    external_id: str
    parent_external_id: str | None
    name: str
    status: str
    attributes: dict = field(default_factory=dict)  # objective, format, placements, ...
    platform_fields: dict = field(default_factory=dict)  # kept verbatim in platform_fields


@dataclass
class DailyInsightRecord:
    ad_external_id: str
    date: date
    spend: float
    impressions: int
    reach: int | None
    clicks: int
    link_clicks: int | None
    conversions: list[tuple[str, str, int, float | None]]  # (type, attribution_setting, count, value)


class PlatformAdapter(Protocol):
    platform: str

    def discover_accounts(self) -> list[AccountRecord]: ...

    def fetch_entities(self, account_external_id: str) -> list[EntityRecord]: ...

    def fetch_daily_insights(self, account_external_id: str, start: date, end: date) -> list[DailyInsightRecord]: ...
