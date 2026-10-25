"""Reporting periods. Dates are inclusive and interpreted in the reporting timezone."""

from collections.abc import Iterator
from dataclasses import dataclass
from datetime import date, timedelta

MAX_PERIOD_DAYS = 400


class PeriodError(ValueError):
    pass


@dataclass(frozen=True)
class Period:
    start: date
    end: date

    def __post_init__(self) -> None:
        if self.start > self.end:
            raise PeriodError("start must be on or before end")
        if self.days > MAX_PERIOD_DAYS:
            raise PeriodError(f"period cannot exceed {MAX_PERIOD_DAYS} days")

    @property
    def days(self) -> int:
        return (self.end - self.start).days + 1

    def previous(self) -> "Period":
        """The period of equal length that ends the day before this one starts."""
        end = self.start - timedelta(days=1)
        return Period(end - timedelta(days=self.days - 1), end)

    def halves(self) -> tuple["Period", "Period"] | None:
        """Split into an earlier and a later half. Returns None for periods shorter than 2 days.

        With an odd number of days the later half gets the extra day.
        """
        if self.days < 2:
            return None
        first_len = self.days // 2
        first = Period(self.start, self.start + timedelta(days=first_len - 1))
        second = Period(first.end + timedelta(days=1), self.end)
        return first, second

    def iter_days(self) -> Iterator[date]:
        for i in range(self.days):
            yield self.start + timedelta(days=i)

    def to_dict(self) -> dict:
        return {"start": self.start.isoformat(), "end": self.end.isoformat(), "days": self.days}


def default_period(today: date, days: int = 30) -> Period:
    """Last ``days`` complete days, ending yesterday. Today is excluded because it is incomplete."""
    end = today - timedelta(days=1)
    return Period(end - timedelta(days=days - 1), end)
