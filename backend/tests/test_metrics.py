import pytest

from app.analytics import metrics as M
from app.analytics.metrics import Totals


def test_safe_div_handles_zero_and_missing():
    assert M.safe_div(10, 2) == 5
    assert M.safe_div(10, 0) is None
    assert M.safe_div(None, 2) is None
    assert M.safe_div(10, None) is None
    assert M.safe_div(0, 5) == 0


def test_ratio_formulas():
    assert M.ctr(50, 1000) == pytest.approx(5.0)
    assert M.cpc(100, 50) == pytest.approx(2.0)
    assert M.cpm(100, 20_000) == pytest.approx(5.0)
    assert M.cpa(900, 3) == pytest.approx(300.0)
    assert M.roas(8000, 1000) == pytest.approx(8.0)


@pytest.mark.parametrize("fn", [M.ctr, M.cpc, M.cpm, M.cpa, M.roas])
def test_ratios_undefined_with_zero_denominator(fn):
    assert fn(10, 0) is None


def test_aggregate_ratio_uses_sums_not_average_of_ratios():
    days = [(100, 10_000), (10, 10_000), (50, 1_000)]  # (clicks, impressions): CTRs 1%, 0.1%, 5%
    t = Totals()
    for clicks, impressions in days:
        t.add_delivery(spend=1, impressions=impressions, reach=None, clicks=clicks, primary_type=None)
    averaged = sum(M.ctr(c, i) for c, i in days) / len(days)
    computed = M.compute_metrics(t)["ctr"]["value"]
    assert computed == pytest.approx(160 / 21_000 * 100)
    assert computed != pytest.approx(averaged)


def test_no_rows_means_unavailable_not_zero():
    out = M.compute_metrics(Totals(), no_data_reason="No ad account connected")
    for key, metric in out.items():
        assert metric["value"] is None, key
        assert metric["unavailable_reason"] == "No ad account connected"


def test_cost_per_result_uses_only_spend_of_matching_campaigns():
    t = Totals()
    t.add_delivery(spend=600, impressions=1000, reach=None, clicks=10, primary_type="lead")
    t.add_conversions("lead", 3, None)
    t.add_delivery(spend=1000, impressions=1000, reach=None, clicks=10, primary_type="purchase")
    t.add_conversions("purchase", 4, 8000)
    t.add_delivery(spend=400, impressions=1000, reach=None, clicks=10, primary_type=None)  # traffic
    out = M.compute_metrics(t)
    assert out["spend"]["value"] == 2000
    assert out["leads"]["value"] == 3
    assert out["cost_per_lead"]["value"] == pytest.approx(200)  # 600 / 3, not 2000 / 3
    assert out["purchases"]["value"] == 4
    assert out["cost_per_purchase"]["value"] == pytest.approx(250)
    assert out["roas"]["value"] == pytest.approx(8.0)  # 8000 / 1000, not 8000 / 2000


def test_missing_campaign_types_are_explained():
    t = Totals()
    t.add_delivery(spend=100, impressions=1000, reach=None, clicks=0, primary_type=None)
    out = M.compute_metrics(t)
    assert out["leads"]["value"] is None
    assert "lead-objective" in out["leads"]["unavailable_reason"]
    assert out["roas"]["value"] is None
    assert out["cpc"]["value"] is None and "No clicks" in out["cpc"]["unavailable_reason"]
    assert out["ctr"]["value"] == 0


def test_zero_results_gives_zero_count_but_undefined_cost():
    t = Totals()
    t.add_delivery(spend=500, impressions=1000, reach=None, clicks=10, primary_type="lead")
    out = M.compute_metrics(t)
    assert out["leads"]["value"] == 0
    assert out["cost_per_lead"]["value"] is None


def test_purchase_value_missing_is_not_zero():
    t = Totals()
    t.add_delivery(spend=500, impressions=1000, reach=None, clicks=10, primary_type="purchase")
    t.add_conversions("purchase", 2, None)
    out = M.compute_metrics(t)
    assert out["purchase_value"]["value"] is None
    assert out["roas"]["value"] is None


def test_currency_reason_blanks_money_only():
    t = Totals()
    t.add_delivery(spend=500, impressions=1000, reach=10, clicks=10, primary_type="lead")
    t.add_conversions("lead", 2, None)
    out = M.compute_metrics(t, currency_reason="mixed")
    for k in M.MONETARY:
        assert out[k]["value"] is None and out[k]["unavailable_reason"] == "mixed"
    assert out["impressions"]["value"] == 1000
    assert out["leads"]["value"] == 2
    assert out["ctr"]["value"] == pytest.approx(1.0)


def test_reach_is_flagged_as_overcounting():
    t = Totals()
    t.add_delivery(spend=1, impressions=10, reach=5, clicks=1, primary_type=None)
    assert "counted more than once" in M.compute_metrics(t)["reach"]["note"]


def test_pct_change():
    assert M.pct_change(150, 100) == pytest.approx(50)
    assert M.pct_change(50, 100) == pytest.approx(-50)
    assert M.pct_change(10, 0) is None
    assert M.pct_change(None, 10) is None
    assert M.pct_change(10, None) is None


@pytest.mark.parametrize(
    "metric,change,direction,assessment",
    [
        ("cost_per_lead", -20, "down", "good"),
        ("cost_per_lead", 20, "up", "bad"),
        ("roas", 20, "up", "good"),
        ("ctr", -5, "down", "bad"),
        ("spend", 40, "up", "neutral"),
        ("cpc", 0.1, "flat", "neutral"),
        ("cpc", None, None, None),
    ],
)
def test_change_assessment(metric, change, direction, assessment):
    assert M.assess_change(metric, change) == {"direction": direction, "assessment": assessment}


def test_with_comparison_merges_previous():
    cur = {"spend": {"value": 200, "unavailable_reason": None}}
    prev = {"spend": {"value": 100, "unavailable_reason": None}}
    out = M.with_comparison(cur, prev)["spend"]
    assert out["previous"] == 100 and out["change_pct"] == pytest.approx(100) and out["assessment"] == "neutral"


def test_entity_summary_for_non_conversion_campaign():
    t = Totals()
    t.add_delivery(spend=100, impressions=1000, reach=None, clicks=20, primary_type=None)
    s = M.entity_summary(t, None)
    assert s["results"] is None and s["cpa"] is None and s["roas"] is None
    assert s["cpc"] == pytest.approx(5)
