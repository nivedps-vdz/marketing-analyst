"""Platform-neutral data model.

Every performance-related row carries ``client_id`` so client scoping is a single indexed filter.
Platform-specific attributes that have no shared meaning go to ``platform_fields``.
"""

from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(120))
    industry: Mapped[str | None] = mapped_column(String(120))
    geography: Mapped[str | None] = mapped_column(String(200))
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)

    ad_accounts: Mapped[list["AdAccount"]] = relationship(back_populates="client", order_by="AdAccount.id")


class AdAccount(Base):
    __tablename__ = "ad_accounts"
    __table_args__ = (UniqueConstraint("platform", "external_id", name="uq_ad_account_platform_ext"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    platform: Mapped[str] = mapped_column(String(30))  # "meta" | "google_ads"
    external_id: Mapped[str] = mapped_column(String(80))
    name: Mapped[str] = mapped_column(String(200))
    currency: Mapped[str] = mapped_column(String(3))
    timezone: Mapped[str] = mapped_column(String(60))
    # "connected" | "expired" | "error" | "not_connected" | "demo"
    connection_status: Mapped[str] = mapped_column(String(30))
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    client: Mapped[Client] = relationship(back_populates="ad_accounts")


class Campaign(Base):
    __tablename__ = "campaigns"
    __table_args__ = (UniqueConstraint("ad_account_id", "external_id", name="uq_campaign_account_ext"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    ad_account_id: Mapped[int] = mapped_column(ForeignKey("ad_accounts.id", ondelete="CASCADE"), index=True)
    external_id: Mapped[str] = mapped_column(String(80))
    name: Mapped[str] = mapped_column(String(300))
    objective: Mapped[str] = mapped_column(String(60))
    # Conversion type that counts as a "result" for this campaign, or None (e.g. traffic, awareness).
    primary_conversion_type: Mapped[str | None] = mapped_column(String(60))
    status: Mapped[str] = mapped_column(String(30))

    ad_account: Mapped[AdAccount] = relationship()


class AdSet(Base):
    __tablename__ = "ad_sets"
    __table_args__ = (UniqueConstraint("campaign_id", "external_id", name="uq_adset_campaign_ext"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), index=True)
    external_id: Mapped[str] = mapped_column(String(80))
    name: Mapped[str] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(String(30))
    optimization_goal: Mapped[str | None] = mapped_column(String(60))

    campaign: Mapped[Campaign] = relationship()


class Creative(Base):
    __tablename__ = "creatives"
    __table_args__ = (UniqueConstraint("ad_account_id", "external_id", name="uq_creative_account_ext"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    ad_account_id: Mapped[int] = mapped_column(ForeignKey("ad_accounts.id", ondelete="CASCADE"), index=True)
    external_id: Mapped[str] = mapped_column(String(80))
    # "image" | "video" | "carousel" | "other" | "unknown". Never guessed.
    format: Mapped[str] = mapped_column(String(30), default="unknown")
    aspect_ratio: Mapped[str | None] = mapped_column(String(10))  # e.g. "9:16", "1:1"
    is_vertical_video: Mapped[bool | None] = mapped_column(Boolean)
    thumbnail_url: Mapped[str | None] = mapped_column(Text)
    headline: Mapped[str | None] = mapped_column(Text)
    body: Mapped[str | None] = mapped_column(Text)
    call_to_action: Mapped[str | None] = mapped_column(String(60))


class Ad(Base):
    __tablename__ = "ads"
    __table_args__ = (UniqueConstraint("ad_set_id", "external_id", name="uq_ad_adset_ext"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), index=True)
    ad_set_id: Mapped[int] = mapped_column(ForeignKey("ad_sets.id", ondelete="CASCADE"), index=True)
    creative_id: Mapped[int | None] = mapped_column(ForeignKey("creatives.id", ondelete="SET NULL"))
    external_id: Mapped[str] = mapped_column(String(80))
    name: Mapped[str] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(String(30))
    # Placements where the ad delivered, e.g. ["feed", "stories", "reels"]. None = unknown.
    placements: Mapped[list[str] | None] = mapped_column(JSON)

    campaign: Mapped[Campaign] = relationship()
    ad_set: Mapped[AdSet] = relationship()
    creative: Mapped[Creative | None] = relationship()


class DailyAdMetric(Base):
    __tablename__ = "daily_ad_metrics"
    __table_args__ = (
        UniqueConstraint("ad_id", "date", name="uq_daily_metric_ad_date"),
        Index("ix_daily_metric_client_date", "client_id", "date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"))
    ad_id: Mapped[int] = mapped_column(ForeignKey("ads.id", ondelete="CASCADE"), index=True)
    date: Mapped[date] = mapped_column(Date)
    spend: Mapped[float] = mapped_column(Numeric(14, 2, asdecimal=False))
    impressions: Mapped[int] = mapped_column(Integer)
    reach: Mapped[int | None] = mapped_column(Integer)
    clicks: Mapped[int] = mapped_column(Integer)
    link_clicks: Mapped[int | None] = mapped_column(Integer)


class DailyAdConversion(Base):
    __tablename__ = "daily_ad_conversions"
    __table_args__ = (
        UniqueConstraint(
            "ad_id", "date", "conversion_type", "attribution_setting", name="uq_daily_conv_ad_date_type_attr"
        ),
        Index("ix_daily_conv_client_date", "client_id", "date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"))
    ad_id: Mapped[int] = mapped_column(ForeignKey("ads.id", ondelete="CASCADE"), index=True)
    date: Mapped[date] = mapped_column(Date)
    conversion_type: Mapped[str] = mapped_column(String(60))  # "lead", "purchase", ...
    attribution_setting: Mapped[str] = mapped_column(String(60))  # e.g. "7d_click_1d_view"
    count: Mapped[int] = mapped_column(Integer)
    value: Mapped[float | None] = mapped_column(Numeric(14, 2, asdecimal=False))


class PlatformField(Base):
    """Platform-specific attributes kept verbatim, without polluting shared tables."""

    __tablename__ = "platform_fields"
    __table_args__ = (UniqueConstraint("entity", "entity_id", "platform", "key", name="uq_platform_field"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    entity: Mapped[str] = mapped_column(String(30))  # "campaign" | "ad_set" | "ad" | "creative"
    entity_id: Mapped[int] = mapped_column(Integer)
    platform: Mapped[str] = mapped_column(String(30))
    key: Mapped[str] = mapped_column(String(120))
    value: Mapped[dict | list | str | int | float | None] = mapped_column(JSON)
