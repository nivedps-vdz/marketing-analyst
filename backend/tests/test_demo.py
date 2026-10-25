from datetime import date, timedelta

from sqlalchemy import func, select

from app.demo.generator import generate
from app.models import AdAccount, Campaign, Client, Creative, DailyAdConversion, DailyAdMetric

END = date(2026, 10, 24)


def _fingerprint(db):
    return (
        db.execute(select(func.count(DailyAdMetric.id), func.sum(DailyAdMetric.spend))).one(),
        db.execute(select(func.count(DailyAdConversion.id), func.sum(DailyAdConversion.count))).one(),
    )


def test_generation_is_deterministic(db, tmp_path, migrated_template):
    counts1 = generate(db, end_date=END)
    db.commit()
    fp1 = _fingerprint(db)
    counts2 = generate(db, end_date=END)  # regenerating replaces, never duplicates
    db.commit()
    assert counts1 == counts2
    assert _fingerprint(db) == fp1


def test_all_demo_records_are_labelled_and_edge_cases_exist(db):
    generate(db, end_date=END)
    db.commit()
    clients = db.execute(select(Client)).scalars().all()
    assert clients and all(c.is_demo for c in clients)

    no_account = [c for c in clients if not c.ad_accounts]
    assert [c.slug for c in no_account] == ["spice-route-kitchen"]

    expired = db.execute(select(AdAccount).where(AdAccount.connection_status == "expired")).scalar_one()
    last = db.execute(select(func.max(DailyAdMetric.date)).where(DailyAdMetric.client_id == expired.client_id)).scalar()
    assert last == END - timedelta(days=9)

    assert db.execute(select(func.count()).where(Creative.format == "unknown")).scalar() > 0

    traffic = db.execute(select(Campaign).where(Campaign.objective == "OUTCOME_TRAFFIC")).scalars().all()
    assert traffic and all(c.primary_conversion_type is None for c in traffic)
    assert db.execute(select(func.max(DailyAdMetric.date))).scalar() == END
