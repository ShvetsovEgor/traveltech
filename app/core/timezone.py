"""Moscow timezone helpers — all business timestamps use MSK (UTC+3)."""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

MSK = ZoneInfo("Europe/Moscow")


def now_msk() -> datetime:
    """Current time as timezone-aware datetime in Europe/Moscow."""
    return datetime.now(MSK)


def to_msk(dt: datetime | str) -> datetime:
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=MSK)
    return dt.astimezone(MSK)


def msk_iso(dt: datetime) -> str:
    return to_msk(dt).isoformat()


def add_hours_msk(hours: float) -> datetime:
    return now_msk() + timedelta(hours=hours)


def add_seconds_msk(seconds: float) -> datetime:
    return now_msk() + timedelta(seconds=seconds)


def is_expired(expires_at_msk: datetime) -> bool:
    return now_msk() >= to_msk(expires_at_msk)
