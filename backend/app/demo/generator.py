"""Deterministic synthetic data for demo mode.

The businesses below are fictional. Output depends only on ``seed`` and ``end_date``, so tests and
screenshots are reproducible. Deliberate edge cases:

- a client with no connected ad account (Spice Route Kitchen)
- an account whose token "expired", so data stops before the end date (BrightPath Coaching)
- creatives with unknown format and ads with unknown placements
- ads without thumbnails (all demo creatives: previews are rendered as placeholders)
- a traffic campaign that records no conversions
- ads that start late (too little data to rank) and ads whose efficiency declines
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from datetime import date, timedelta

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models import Ad, AdAccount, AdSet, Campaign, Client, Creative, DailyAdConversion, DailyAdMetric
from app.platforms import primary_conversion_type
from app.services.aggregation import DEFAULT_ATTRIBUTION

DEFAULT_SEED = 20261025
DEFAULT_DAYS = 120


@dataclass
class CampaignSpec:
    name: str
    objective: str
    daily_budget: float
    cpm: float          # base cost per 1,000 impressions (INR)
    ctr: float          # base click-through rate (fraction)
    cvr: float = 0.0    # base conversions per link click
    aov: float = 0.0    # average purchase value (sales only)
    status: str = "ACTIVE"
    themes: list[str] = field(default_factory=list)


@dataclass
class ClientSpec:
    slug: str
    name: str
    category: str
    industry: str
    geography: str
    account_status: str | None  # None = no ad account
    stop_days_before_end: int = 0
    weekend_lift: float = 0.0
    campaigns: list[CampaignSpec] = field(default_factory=list)


CLIENTS: list[ClientSpec] = [
    ClientSpec(
        "malabar-heights", "Malabar Heights Realty", "Real estate", "Real estate", "Kozhikode, Kerala",
        "demo", weekend_lift=0.15,
        campaigns=[
            CampaignSpec("Lead Gen | 2BHK Apartments | Kozhikode", "OUTCOME_LEADS", 2600, 210, 0.011, 0.05,
                         themes=["Site visit offer", "Walkthrough video", "Floor plan carousel", "Price reveal"]),
            CampaignSpec("Lead Gen | Villa Plots | NRI Gulf", "OUTCOME_LEADS", 1800, 260, 0.009, 0.035,
                         themes=["NRI investment", "Plot drone tour", "Payment plan"]),
            CampaignSpec("Awareness | Brand Video | Malabar", "OUTCOME_AWARENESS", 700, 70, 0.004,
                         themes=["Brand film", "Testimonial"]),
        ],
    ),
    ClientSpec(
        "sahyadri-ayurveda", "Sahyadri Ayurveda Wellness", "Healthcare", "Ayurveda clinic", "Thrissur, Kerala",
        "demo",
        campaigns=[
            CampaignSpec("Leads | Panchakarma Packages", "OUTCOME_LEADS", 1500, 150, 0.014, 0.06,
                         themes=["Monsoon therapy", "Doctor consultation", "Before-after story"]),
            CampaignSpec("Leads | Back Pain Programme", "OUTCOME_LEADS", 900, 140, 0.013, 0.045,
                         themes=["Pain relief reel", "Patient review", "Free assessment"]),
            CampaignSpec("Traffic | Wellness Blog", "OUTCOME_TRAFFIC", 500, 90, 0.018,
                         themes=["Ayurveda tips", "Diet guide"]),
        ],
    ),
    ClientSpec(
        "kanchana-gold", "Kanchana Gold & Diamonds", "Jewellery retail", "Jewellery", "Kochi, Kerala",
        "demo", weekend_lift=0.25,
        campaigns=[
            CampaignSpec("Sales | Bridal Collection | Catalogue", "OUTCOME_SALES", 4200, 180, 0.012, 0.0035, 38000,
                         themes=["Bridal set carousel", "Kerala bride reel", "Temple jewellery", "Making charges offer"]),
            CampaignSpec("Sales | Daily Wear Lightweight", "OUTCOME_SALES", 2200, 160, 0.015, 0.008, 9500,
                         themes=["Office wear studs", "Under 10k picks", "Gift for her"]),
            CampaignSpec("Awareness | Onam Showroom Launch", "OUTCOME_AWARENESS", 1200, 65, 0.005, status="PAUSED",
                         themes=["Showroom launch", "Onam greetings"]),
        ],
    ),
    ClientSpec(
        "kerala-handloom", "Kerala Handloom House", "E-commerce", "Apparel", "Kannur, Kerala",
        "demo", weekend_lift=0.1,
        campaigns=[
            CampaignSpec("Sales | Kasavu Sarees | Prospecting", "OUTCOME_SALES", 1600, 130, 0.016, 0.0125, 3400,
                         themes=["Kasavu saree reel", "Weaver story", "Festive combo", "Free shipping"]),
            CampaignSpec("Sales | Retargeting | Cart Visitors", "OUTCOME_SALES", 600, 220, 0.021, 0.032, 2900,
                         themes=["Cart reminder", "Bestsellers carousel"]),
            CampaignSpec("Engagement | Handloom Day", "OUTCOME_ENGAGEMENT", 300, 60, 0.02,
                         themes=["Handloom quiz", "Behind the loom"]),
        ],
    ),
    ClientSpec(
        "brightpath-coaching", "BrightPath Coaching Academy", "Education", "Entrance coaching",
        "Thiruvananthapuram, Kerala", "expired", stop_days_before_end=9,
        campaigns=[
            CampaignSpec("Leads | NEET Repeaters Batch", "OUTCOME_LEADS", 1700, 120, 0.017, 0.07,
                         themes=["Topper testimonial", "Scholarship test", "Faculty intro"]),
            CampaignSpec("Leads | Class 11 Foundation", "OUTCOME_LEADS", 1100, 115, 0.015, 0.05,
                         themes=["Parents webinar", "Early bird fee", "Demo class"]),
        ],
    ),
    ClientSpec(
        "spice-route-kitchen", "Spice Route Kitchen", "Restaurant", "Food & beverage", "Alappuzha, Kerala",
        None,
    ),
]

FORMATS = [  # (format, aspect ratio, is_vertical_video, weight)
    ("video", "9:16", True, 3),
    ("video", "1:1", False, 1),
    ("image", "1:1", None, 3),
    ("image", "4:5", None, 1),
    ("carousel", "1:1", None, 2),
    ("unknown", None, None, 1),
]

PLACEMENT_SETS = {
    "video_vertical": ["feed", "stories", "reels"],
    "video_square": ["feed", "in_stream_video"],
    "image": ["feed", "stories", "right_column"],
    "carousel": ["feed", "explore"],
}

CTAS = {"OUTCOME_LEADS": "SIGN_UP", "OUTCOME_SALES": "SHOP_NOW", "OUTCOME_TRAFFIC": "LEARN_MORE",
        "OUTCOME_AWARENESS": "LEARN_MORE", "OUTCOME_ENGAGEMENT": "LIKE_PAGE"}

AD_SET_AUDIENCES = ["Broad 25-55", "Interest: Lookalike 1%", "Retargeting 30d", "Advantage+ audience"]


def _trend(kind: str, i: int, n: int) -> float:
    x = i / max(n - 1, 1)
    if kind == "declining":
        return 1.2 - 0.65 * x
    if kind == "improving":
        return 0.8 + 0.4 * x
    return 1.0


def clear_demo_data(db: Session) -> None:
    db.execute(delete(Client).where(Client.is_demo.is_(True)))
    db.flush()


def generate(db: Session, *, end_date: date, seed: int = DEFAULT_SEED, days: int = DEFAULT_DAYS) -> dict[str, int]:
    """Replace all demo clients with freshly generated data ending on ``end_date``. Returns row counts."""
    rng = random.Random(seed)
    clear_demo_data(db)
    start = end_date - timedelta(days=days - 1)
    counts = {"clients": 0, "campaigns": 0, "ad_sets": 0, "ads": 0, "metric_rows": 0, "conversion_rows": 0}
    ext = 120200000000000  # Meta-style numeric IDs, fake

    def next_ext() -> str:
        nonlocal ext
        ext += rng.randint(1, 9999)
        return str(ext)

    for cs in CLIENTS:
        client = Client(slug=cs.slug, name=cs.name, category=cs.category, industry=cs.industry,
                        geography=cs.geography, is_demo=True)
        db.add(client)
        db.flush()
        counts["clients"] += 1
        if cs.account_status is None:
            continue

        account = AdAccount(client_id=client.id, platform="meta", external_id=f"act_{next_ext()}",
                            name=f"{cs.name} - Meta", currency="INR", timezone="Asia/Kolkata",
                            connection_status=cs.account_status, last_synced_at=None)
        db.add(account)
        db.flush()
        last_index = days - 1 - cs.stop_days_before_end

        for spec in cs.campaigns:
            ptype = primary_conversion_type("meta", spec.objective)
            camp = Campaign(client_id=client.id, ad_account_id=account.id, external_id=next_ext(), name=spec.name,
                            objective=spec.objective, primary_conversion_type=ptype, status=spec.status)
            db.add(camp)
            db.flush()
            counts["campaigns"] += 1
            camp_stop = days - 1 - rng.randint(20, 40) if spec.status == "PAUSED" else days - 1

            n_sets = 2 if len(spec.themes) >= 3 else 1
            audiences = rng.sample(AD_SET_AUDIENCES, n_sets)
            for s_idx, aud in enumerate(audiences):
                ad_set = AdSet(client_id=client.id, campaign_id=camp.id, external_id=next_ext(),
                               name=f"{aud} | {cs.geography.split(',')[0]}", status=spec.status,
                               optimization_goal={"lead": "LEAD_GENERATION", "purchase": "OFFSITE_CONVERSIONS"}
                               .get(ptype or "", "LINK_CLICKS" if spec.objective == "OUTCOME_TRAFFIC" else "REACH"))
                db.add(ad_set)
                db.flush()
                counts["ad_sets"] += 1
                set_themes = spec.themes[s_idx::n_sets]
                for theme in set_themes:
                    fmt, aspect, vertical, _ = rng.choices(FORMATS, weights=[f[3] for f in FORMATS])[0]
                    creative = Creative(
                        client_id=client.id, ad_account_id=account.id, external_id=next_ext(), format=fmt,
                        aspect_ratio=aspect, is_vertical_video=vertical, thumbnail_url=None,
                        headline=None if fmt == "unknown" else theme,
                        body=None if fmt == "unknown" else f"{theme} from {cs.name}. Limited period, {cs.geography}.",
                        call_to_action=None if fmt == "unknown" else CTAS.get(spec.objective),
                    )
                    db.add(creative)
                    db.flush()
                    if fmt == "video":
                        placements = PLACEMENT_SETS["video_vertical" if vertical else "video_square"]
                    elif fmt in PLACEMENT_SETS:
                        placements = PLACEMENT_SETS[fmt]
                    else:
                        placements = None  # unknown
                    ad = Ad(client_id=client.id, campaign_id=camp.id, ad_set_id=ad_set.id, creative_id=creative.id,
                            external_id=next_ext(), name=f"{theme} | V{rng.randint(1, 3)}",
                            status=spec.status, placements=placements)
                    db.add(ad)
                    db.flush()
                    counts["ads"] += 1

                    # Per-ad character
                    share = rng.uniform(0.5, 1.5) / len(spec.themes)
                    quality = rng.uniform(0.6, 1.5)
                    trend = rng.choices(["stable", "declining", "improving"], weights=[5, 2, 2])[0]
                    late_start = rng.random() < 0.12
                    start_i = days - rng.randint(4, 10) if late_start else rng.randint(0, 20)
                    fmt_ctr = {"video": 1.1, "carousel": 1.15, "image": 0.9}.get(fmt, 1.0)

                    for i in range(start_i, min(last_index, camp_stop) + 1):
                        d = start + timedelta(days=i)
                        weekend = cs.weekend_lift if d.weekday() >= 5 else 0.0
                        wave = 1 + 0.08 * math.sin(i / 6.0)
                        spend = round(spec.daily_budget * share * (1 + weekend) * wave * rng.uniform(0.75, 1.25), 2)
                        if late_start:
                            spend = round(spend * 0.35, 2)
                        cpm_day = spec.cpm * rng.uniform(0.85, 1.2)
                        impressions = int(spend / cpm_day * 1000)
                        reach = int(impressions / rng.uniform(1.15, 1.7))
                        tf = _trend(trend, i - start_i, days - start_i)
                        clicks = max(0, round(impressions * spec.ctr * quality * fmt_ctr * tf * rng.uniform(0.8, 1.2)))
                        link_clicks = int(clicks * rng.uniform(0.6, 0.85))
                        db.add(DailyAdMetric(client_id=client.id, ad_id=ad.id, date=d, spend=spend,
                                             impressions=impressions, reach=reach, clicks=clicks,
                                             link_clicks=link_clicks))
                        counts["metric_rows"] += 1

                        if ptype:
                            expected = link_clicks * spec.cvr * quality * tf
                            n_conv = int(expected) + (1 if rng.random() < expected - int(expected) else 0)
                            if n_conv > 0:
                                value = (round(sum(spec.aov * rng.uniform(0.6, 1.5) for _ in range(n_conv)), 2)
                                         if ptype == "purchase" else None)
                                db.add(DailyAdConversion(client_id=client.id, ad_id=ad.id, date=d,
                                                         conversion_type=ptype,
                                                         attribution_setting=DEFAULT_ATTRIBUTION,
                                                         count=n_conv, value=value))
                                counts["conversion_rows"] += 1
    db.flush()
    return counts
