from app.analytics import insights as I
from app.analytics.metrics import Totals, entity_summary
from app.analytics.rankings import AdPerf, Thresholds, rank_ads

TH = Thresholds(min_spend=2000, min_impressions=5000, min_conversions=5)


def perf(ad_id, *, spend, impressions, clicks, ptype, results=0, value=None, category=None, fmt="image"):
    t = Totals()
    t.add_delivery(spend=spend, impressions=impressions, reach=None, clicks=clicks, primary_type=ptype)
    if ptype and results:
        t.add_conversions(ptype, results, value)
    cat = category or {"lead": "leads", "purchase": "sales", None: "traffic"}[ptype]
    return AdPerf(ad_id, f"ad{ad_id}", "camp", cat, fmt, entity_summary(t, ptype))


def by_key(result, key):
    return next(r for r in result["rankings"] if r["key"] == key)


def test_high_ctr_without_results_is_not_a_lead_winner():
    ads = [
        perf(1, spend=3000, impressions=20_000, clicks=2000, ptype="lead", results=1),   # CTR 10%, 1 lead
        perf(2, spend=3000, impressions=20_000, clicks=200, ptype="lead", results=20),   # CTR 1%, 20 leads
    ]
    r = rank_ads(ads, TH)
    cpl = by_key(r, "lowest_cost_per_lead")
    assert [e["ad_id"] for e in cpl["entries"]] == [2]  # ad 1 has too few results to rank on cost
    ctr = by_key(r, "highest_ctr")
    assert ctr["entries"][0]["ad_id"] == 1
    assert ctr["caveat"] and "not a performance verdict" in ctr["caveat"]


def test_insufficient_data_goes_to_needs_more_data():
    ads = [
        perf(1, spend=500, impressions=20_000, clicks=200, ptype="lead", results=10),  # low spend
        perf(2, spend=5000, impressions=1000, clicks=20, ptype="lead", results=10),    # low impressions
        perf(3, spend=5000, impressions=20_000, clicks=200, ptype="lead", results=10),
    ]
    r = rank_ads(ads, TH)
    assert {e["ad_id"] for e in r["needs_more_data"]["entries"]} == {1, 2}
    assert [e["ad_id"] for e in by_key(r, "lowest_cost_per_lead")["entries"]] == [3]


def test_lead_and_purchase_costs_are_ranked_separately():
    ads = [
        perf(1, spend=3000, impressions=20_000, clicks=200, ptype="lead", results=30),
        perf(2, spend=3000, impressions=20_000, clicks=200, ptype="purchase", results=6, value=30_000),
    ]
    r = rank_ads(ads, TH)
    assert [e["ad_id"] for e in by_key(r, "lowest_cost_per_lead")["entries"]] == [1]
    assert [e["ad_id"] for e in by_key(r, "lowest_cost_per_purchase")["entries"]] == [2]
    assert by_key(r, "highest_roas")["entries"][0]["metric_value"] == 10


def test_traffic_ads_ranked_on_cpc_and_ranking_states_criteria():
    ads = [
        perf(1, spend=3000, impressions=20_000, clicks=300, ptype=None),
        perf(2, spend=3000, impressions=20_000, clicks=600, ptype=None),
    ]
    r = by_key(rank_ads(ads, TH), "lowest_cpc_traffic")
    assert [e["ad_id"] for e in r["entries"]] == [2, 1]
    assert "CPC = spend ÷ clicks" in r["criteria"]


def test_budget_without_results():
    camps = [
        I.CampaignPerf(1, "Burner", perf(1, spend=7000, impressions=50_000, clicks=500, ptype="lead", results=2).m),
        I.CampaignPerf(2, "Fine", perf(2, spend=7000, impressions=50_000, clicks=500, ptype="lead", results=40).m),
        I.CampaignPerf(3, "Traffic", perf(3, spend=9000, impressions=50_000, clicks=500, ptype=None).m),
    ]
    out = I.budget_without_results(camps, TH)
    assert [i["entity"]["id"] for i in out] == [1]
    assert out[0]["basis"] == "calculated"


def test_declining_efficiency_requires_ctr_drop_too():
    first = {1: perf(1, spend=3000, impressions=20_000, clicks=400, ptype="lead", results=30),
             2: perf(2, spend=3000, impressions=20_000, clicks=400, ptype="lead", results=30)}
    second = {
        # CPA doubled and CTR fell -> flagged
        1: perf(1, spend=3000, impressions=20_000, clicks=200, ptype="lead", results=15),
        # CPA doubled but CTR rose -> not flagged
        2: perf(2, spend=3000, impressions=20_000, clicks=600, ptype="lead", results=15),
    }
    out = I.declining_efficiency(first, second, TH)
    assert [i["entity"]["id"] for i in out] == [1]
    assert "fatigue" not in (out[0]["title"] + out[0]["detail"]).lower()


def test_ctr_drop_alone_does_not_flag():
    first = {1: perf(1, spend=3000, impressions=20_000, clicks=400, ptype="lead", results=30)}
    second = {1: perf(1, spend=3000, impressions=20_000, clicks=200, ptype="lead", results=30)}
    assert I.declining_efficiency(first, second, TH) == []


def test_format_worth_testing():
    by_format = {
        "video": {"lead": {"spend": 2500, "results": 25}},   # CPL 100, 25% of spend
        "image": {"lead": {"spend": 7500, "results": 25}},   # CPL 300
    }
    overall = {"lead": {"spend": 10_000, "results": 50}}     # CPL 200
    out = I.formats_worth_testing(by_format, overall, TH)
    assert [i["entity"]["id"] for i in out] == ["video"]
    assert "not proof" in out[0]["detail"]
