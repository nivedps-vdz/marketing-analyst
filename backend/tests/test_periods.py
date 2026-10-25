from datetime import date

import pytest

from app.analytics.periods import Period, PeriodError, default_period


def test_days_inclusive():
    assert Period(date(2026, 1, 1), date(2026, 1, 1)).days == 1
    assert Period(date(2026, 1, 1), date(2026, 1, 31)).days == 31


def test_previous_period_same_length_and_adjacent():
    p = Period(date(2026, 3, 1), date(2026, 3, 10))
    prev = p.previous()
    assert prev == Period(date(2026, 2, 19), date(2026, 2, 28))
    assert prev.days == p.days


def test_halves_odd_length():
    first, second = Period(date(2026, 1, 1), date(2026, 1, 5)).halves()
    assert first == Period(date(2026, 1, 1), date(2026, 1, 2))
    assert second == Period(date(2026, 1, 3), date(2026, 1, 5))
    assert Period(date(2026, 1, 1), date(2026, 1, 1)).halves() is None


def test_validation():
    with pytest.raises(PeriodError):
        Period(date(2026, 1, 2), date(2026, 1, 1))
    with pytest.raises(PeriodError):
        Period(date(2024, 1, 1), date(2026, 1, 1))


def test_default_period_excludes_today():
    p = default_period(date(2026, 10, 25))
    assert p.end == date(2026, 10, 24)
    assert p.days == 30
