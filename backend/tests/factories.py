"""Small hand-built datasets with numbers that can be checked by hand."""

from dataclasses import dataclass
from datetime import date

from sqlalchemy.orm import Session

from app.models import Ad, AdAccount, AdSet, Campaign, Client, Creative, DailyAdConversion, DailyAdMetric
from app.platforms import primary_conversion_type
from app.services.aggregation import DEFAULT_ATTRIBUTION

D1, D2, D3, D4 = date(2026, 1, 1), date(2026, 1, 2), date(2026, 1, 3), date(2026, 1, 4)

_counter = 0


def _ext() -> str:
    global _counter
    _counter += 1
    return str(1000 + _counter)


def client(db: Session, slug: str) -> Client:
    c = Client(slug=slug, name=slug.replace("-", " ").title(), category="Test", is_demo=True)
    db.add(c)
    db.flush()
    return c


def account(db: Session, c: Client, currency: str = "INR", platform: str = "meta") -> AdAccount:
    a = AdAccount(client_id=c.id, platform=platform, external_id=f"act_{_ext()}", name=f"{c.name} acct",
                  currency=currency, timezone="Asia/Kolkata", connection_status="demo")
    db.add(a)
    db.flush()
    return a


def campaign(db: Session, a: AdAccount, name: str, objective: str) -> Campaign:
    k = Campaign(client_id=a.client_id, ad_account_id=a.id, external_id=_ext(), name=name, objective=objective,
                 primary_conversion_type=primary_conversion_type(a.platform, objective), status="ACTIVE")
    db.add(k)
    db.flush()
    return k


def ad(db: Session, k: Campaign, name: str, fmt: str | None = "image") -> Ad:
    s = AdSet(client_id=k.client_id, campaign_id=k.id, external_id=_ext(), name=f"{name} set", status="ACTIVE")
    db.add(s)
    db.flush()
    cr = None
    if fmt is not None:
        cr = Creative(client_id=k.client_id, ad_account_id=k.ad_account_id, external_id=_ext(), format=fmt)
        db.add(cr)
        db.flush()
    a = Ad(client_id=k.client_id, campaign_id=k.id, ad_set_id=s.id, creative_id=cr.id if cr else None,
           external_id=_ext(), name=name, status="ACTIVE", placements=["feed"])
    db.add(a)
    db.flush()
    return a


def day(db: Session, a: Ad, d: date, spend: float, impressions: int, clicks: int, reach: int | None = None) -> None:
    db.add(DailyAdMetric(client_id=a.client_id, ad_id=a.id, date=d, spend=spend, impressions=impressions,
                         reach=reach, clicks=clicks, link_clicks=clicks))
    db.flush()


def conv(db: Session, a: Ad, d: date, ctype: str, count: int, value: float | None = None,
         attribution: str = DEFAULT_ATTRIBUTION) -> None:
    db.add(DailyAdConversion(client_id=a.client_id, ad_id=a.id, date=d, conversion_type=ctype,
                             attribution_setting=attribution, count=count, value=value))
    db.flush()


@dataclass
class TwoClients:
    a: Client
    b: Client
    a_lead_campaign: Campaign
    b_sales_campaign: Campaign
    a1: Ad
    a2: Ad
    b1: Ad


def two_clients(db: Session) -> TwoClients:
    """Client A: lead campaign with two ads. Client B: sales campaign with one ad.

    Client A, D1-D2 totals: spend 450, impressions 21,000, clicks 160, leads 3.
    Client B, D1: spend 1,000, impressions 50,000, clicks 500, purchases 4, value 8,000.
    """
    a = client(db, "client-a")
    b = client(db, "client-b")
    acc_a, acc_b = account(db, a), account(db, b)
    ka = campaign(db, acc_a, "A Leads", "OUTCOME_LEADS")
    kb = campaign(db, acc_b, "B Sales", "OUTCOME_SALES")
    a1, a2 = ad(db, ka, "A1 image", "image"), ad(db, ka, "A2 video", "video")
    b1 = ad(db, kb, "B1 carousel", "carousel")

    day(db, a1, D1, 100, 10_000, 100, reach=8_000)
    conv(db, a1, D1, "lead", 2)
    # Not the campaign's result type: must be ignored.
    conv(db, a1, D1, "purchase", 5, 999)
    # Different attribution setting: must not be mixed in.
    conv(db, a1, D1, "lead", 100, attribution="1d_click")
    day(db, a1, D2, 300, 10_000, 10, reach=9_000)
    conv(db, a1, D2, "lead", 1)
    day(db, a2, D1, 50, 1_000, 50, reach=900)
    # D3: no rows (covered gap). D4: delivery with zero clicks.
    day(db, a1, D4, 10, 100, 0, reach=90)

    day(db, b1, D1, 1000, 50_000, 500, reach=40_000)
    conv(db, b1, D1, "purchase", 4, 8000)
    db.commit()
    return TwoClients(a, b, ka, kb, a1, a2, b1)
