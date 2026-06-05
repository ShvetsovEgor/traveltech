"""Названия агентств гида (синхронно с src/app/config/guideAgencies.ts)."""

from __future__ import annotations

from app.models.enums import GuideAgency
from app.services.redis_client import RedisStore

GUIDE_AGENCY_LABELS: dict[GuideAgency, str] = {
    GuideAgency.TRAVELTECH: "Технологии путешествий",
    GuideAgency.UMATOUR: "Уматур",
    GuideAgency.INNOTRAVEL: "Иннотрэвел",
}


def guide_agency_label(agency: GuideAgency) -> str:
    return GUIDE_AGENCY_LABELS.get(agency, agency.value)


def parse_guide_agency(raw: str | None) -> GuideAgency:
    if not raw:
        return GuideAgency.TRAVELTECH
    try:
        return GuideAgency(raw)
    except ValueError:
        return GuideAgency.TRAVELTECH


async def resolve_agency_for_interaction(
    redis: RedisStore,
    interaction_token: str,
) -> tuple[str, str]:
    """(agency_id, agency_label) для interaction → kiosk_token → KioskAuth."""
    session = await redis.get_json(f"interaction:{interaction_token}")
    if not session:
        default = GuideAgency.TRAVELTECH
        return default.value, guide_agency_label(default)

    kiosk_token = session.get("kiosk_token")
    if not kiosk_token:
        default = GuideAgency.TRAVELTECH
        return default.value, guide_agency_label(default)

    auth = await redis.get_json(f"kiosk:{kiosk_token}")
    agency = parse_guide_agency(auth.get("agency_id") if auth else None)
    return agency.value, guide_agency_label(agency)
