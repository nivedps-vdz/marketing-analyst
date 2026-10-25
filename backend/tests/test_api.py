import pytest
from sqlalchemy.exc import IntegrityError

from tests import factories as F

P12 = {"start": "2026-01-01", "end": "2026-01-02"}


@pytest.fixture
def data(db):
    return F.two_clients(db)


def metric(resp, key):
    return resp.json()["metrics"][key]["value"]


def test_responses_are_labelled_demo(api, data):
    assert api.get("/api/health").json()["data_source"] == "demo"
    assert api.get(f"/api/clients/{data.a.id}/summary", params=P12).json()["data_source"] == "demo"


def test_client_summary_uses_only_that_clients_rows(api, data):
    r = api.get(f"/api/clients/{data.a.id}/summary", params=P12)
    assert r.status_code == 200
    assert metric(r, "spend") == pytest.approx(450)
    assert metric(r, "impressions") == 21_000
    assert metric(r, "clicks") == 160
    assert metric(r, "ctr") == pytest.approx(160 / 21_000 * 100)
    assert metric(r, "cpc") == pytest.approx(450 / 160)
    assert metric(r, "leads") == 3  # ignores other conversion types and other attribution settings
    assert metric(r, "cost_per_lead") == pytest.approx(150)
    assert metric(r, "purchases") is None  # client A has no sales campaigns; B's purchases do not leak


def test_overview_combines_clients_without_mixing_result_types(api, data):
    r = api.get("/api/overview/summary", params=P12)
    assert metric(r, "spend") == pytest.approx(1450)
    assert metric(r, "cost_per_lead") == pytest.approx(150)
    assert metric(r, "cost_per_purchase") == pytest.approx(250)
    assert metric(r, "roas") == pytest.approx(8.0)


def test_overview_client_filter(api, data):
    r = api.get("/api/overview/summary", params={**P12, "client_ids": [data.b.id]})
    assert metric(r, "spend") == pytest.approx(1000)
    # A filter containing only unknown or inaccessible IDs selects nothing; it never widens to all clients
    r = api.get("/api/overview/summary", params={**P12, "client_ids": [99999]})
    assert r.status_code == 200
    assert metric(r, "spend") is None


def test_client_lists_only_own_entities(api, data):
    ads = api.get(f"/api/clients/{data.a.id}/ads", params=P12).json()["ads"]
    assert {a["id"] for a in ads} == {data.a1.id, data.a2.id}
    camps = api.get(f"/api/clients/{data.a.id}/campaigns", params=P12).json()["campaigns"]
    assert [c["id"] for c in camps] == [data.a_lead_campaign.id]


def test_cross_client_ids_return_404(api, data):
    a = data.a.id
    assert api.get(f"/api/clients/{a}/ads/{data.b1.id}", params=P12).status_code == 404
    assert api.get(f"/api/clients/{a}/summary", params={**P12, "campaign_id": data.b_sales_campaign.id}).status_code == 404
    assert api.get(f"/api/clients/{a}/ads", params={**P12, "campaign_id": data.b_sales_campaign.id}).status_code == 404
    assert api.get("/api/clients/99999/summary", params=P12).status_code == 404
    assert api.get(f"/api/clients/{a}/ads/{data.a1.id}", params=P12).status_code == 200


def test_date_filter_is_inclusive(api, data):
    r = api.get(f"/api/clients/{data.a.id}/summary", params={"start": "2026-01-02", "end": "2026-01-02"})
    assert metric(r, "spend") == pytest.approx(300)


@pytest.mark.parametrize("params", [
    {"start": "2026-01-05", "end": "2026-01-01"},
    {"start": "2024-01-01", "end": "2026-01-01"},
    {"start": "2026-01-01"},
    {"start": "not-a-date", "end": "2026-01-01"},
    {**P12, "platform": "tiktok"},
])
def test_invalid_parameters_rejected(api, data, params):
    assert api.get(f"/api/clients/{data.a.id}/summary", params=params).status_code == 422


def test_previous_period_comparison(api, data):
    r = api.get(f"/api/clients/{data.a.id}/summary", params={"start": "2026-01-03", "end": "2026-01-04"}).json()
    assert r["previous_period"] == {"start": "2026-01-01", "end": "2026-01-02", "days": 2}
    spend = r["metrics"]["spend"]
    assert spend["value"] == pytest.approx(10) and spend["previous"] == pytest.approx(450)
    assert spend["change_pct"] == pytest.approx((10 - 450) / 450 * 100)
    assert spend["assessment"] == "neutral"


def test_timeseries_distinguishes_no_delivery_from_no_data(api, data):
    pts = api.get(f"/api/clients/{data.a.id}/timeseries",
                  params={"start": "2025-12-31", "end": "2026-01-05"}).json()["points"]
    by_date = {p["date"]: p for p in pts}
    assert len(pts) == 6
    # Before the first synced day: unknown, not zero
    assert by_date["2025-12-31"]["has_data"] is False and by_date["2025-12-31"]["spend"] is None
    # After the last synced day: unknown
    assert by_date["2026-01-05"]["spend"] is None
    # Inside the synced range with no delivery: genuinely zero, ratios undefined
    gap = by_date["2026-01-03"]
    assert gap["has_data"] is True and gap["spend"] == 0 and gap["ctr"] is None and gap["leads"] == 0
    # Delivery with zero clicks: CTR 0, CPC undefined
    assert by_date["2026-01-04"]["ctr"] == 0 and by_date["2026-01-04"]["cpc"] is None
    # Daily ratio computed from that day's sums
    assert by_date["2026-01-01"]["ctr"] == pytest.approx(150 / 11_000 * 100)


def test_mixed_currency_blanks_money(api, db):
    c = F.client(db, "multi-currency")
    for cur in ("INR", "USD"):
        k = F.campaign(db, F.account(db, c, currency=cur), f"{cur} camp", "OUTCOME_TRAFFIC")
        F.day(db, F.ad(db, k, f"{cur} ad"), F.D1, 100, 1000, 10)
    db.commit()
    r = api.get(f"/api/clients/{c.id}/summary", params=P12).json()
    assert r["currency"] is None
    assert r["metrics"]["spend"]["value"] is None
    assert "different currencies" in r["metrics"]["spend"]["unavailable_reason"]
    assert r["metrics"]["impressions"]["value"] == 2000


def test_client_without_account(api, db):
    c = F.client(db, "no-account")
    db.commit()
    r = api.get(f"/api/clients/{c.id}/summary", params=P12).json()
    assert r["metrics"]["spend"] == {**r["metrics"]["spend"], "value": None,
                                     "unavailable_reason": "No ad account connected"}
    cards = api.get("/api/overview/clients", params=P12).json()["clients"]
    assert next(x for x in cards if x["id"] == c.id)["connection_status"] == "not_connected"


def test_google_ads_platform_is_not_connected(api, data):
    r = api.get(f"/api/clients/{data.a.id}/summary", params={**P12, "platform": "google_ads"}).json()
    assert r["metrics"]["spend"]["value"] is None
    assert "Google Ads is not connected" in r["metrics"]["spend"]["unavailable_reason"]


def test_format_breakdown_separates_unknown(api, db, data):
    F.day(db, F.ad(db, data.a_lead_campaign, "no creative", fmt=None), F.D1, 5, 100, 1)
    db.commit()
    rows = api.get(f"/api/clients/{data.a.id}/formats", params=P12).json()["rows"]
    fmts = {r["format"]: r for r in rows}
    assert set(fmts) == {"image", "video", "unknown"}
    assert fmts["image"]["metrics"]["spend"] == pytest.approx(400)
    assert sum(r["spend_share"] for r in rows) == pytest.approx(1)


def test_format_filter_updates_summary(api, data):
    r = api.get(f"/api/clients/{data.a.id}/summary", params={**P12, "format": "video"})
    assert metric(r, "spend") == pytest.approx(50)


def test_ad_sorting_puts_undefined_last(api, data):
    for order in ("asc", "desc"):
        ads = api.get(f"/api/clients/{data.a.id}/ads", params={**P12, "sort": "cpa", "order": order}).json()["ads"]
        assert ads[-1]["id"] == data.a2.id  # zero leads -> undefined CPA


def test_ad_detail_contains_series_and_context(api, data):
    ad = api.get(f"/api/clients/{data.a.id}/ads/{data.a1.id}", params=P12).json()["ad"]
    assert len(ad["timeseries"]) == 2
    assert ad["campaign_context"]["ads_in_campaign"] == 2
    assert ad["campaign_context"]["spend_share"] == pytest.approx(400 / 450)


def test_search_scoped_and_escapes_wildcards(api, data):
    r = api.get("/api/search", params={"q": "A1"}).json()
    assert [a["id"] for a in r["ads"]] == [data.a1.id]
    assert api.get("/api/search", params={"q": "%%"}).json()["ads"] == []
    assert api.get("/api/search", params={"q": "a"}).status_code == 422


def test_rankings_and_insights_endpoints(api, data):
    r = api.get(f"/api/clients/{data.a.id}/rankings", params=P12).json()
    assert r["data_source"] == "demo"
    # Both ads are far below the 2,000 spend threshold
    assert len(r["needs_more_data"]["entries"]) == 2
    i = api.get(f"/api/clients/{data.a.id}/insights", params=P12).json()
    assert all(x["basis"] == "calculated" for x in i["insights"])


def test_unique_constraint_prevents_duplicate_daily_rows(db, data):
    with pytest.raises(IntegrityError):
        F.day(db, data.a1, F.D1, 1, 1, 1)
    db.rollback()
