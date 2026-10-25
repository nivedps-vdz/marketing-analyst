"""Apply migrations and (re)generate demo data.

Usage (from backend/):  .venv\\Scripts\\python.exe -m app.demo.seed [--end YYYY-MM-DD]
By default demo data ends yesterday in the reporting timezone.
"""

import argparse
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.config import get_settings
from app.db.migrate import upgrade_to_head
from app.db.session import SessionLocal
from app.demo.generator import DEFAULT_SEED, generate


def main() -> None:
    settings = get_settings()
    parser = argparse.ArgumentParser(description="Generate synthetic demo data")
    parser.add_argument("--end", type=date.fromisoformat, default=None, help="last day of demo data")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    args = parser.parse_args()

    if settings.data_mode != "demo":
        raise SystemExit("DATA_MODE is not 'demo'; refusing to write synthetic data.")

    end = args.end or (datetime.now(ZoneInfo(settings.reporting_timezone)).date() - timedelta(days=1))
    upgrade_to_head()
    with SessionLocal() as db:
        counts = generate(db, end_date=end, seed=args.seed)
        db.commit()
    print(f"Demo data generated through {end.isoformat()}: {counts}")


if __name__ == "__main__":
    main()
