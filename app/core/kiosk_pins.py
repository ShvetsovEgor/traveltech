"""PIN-коды гида: агентство × точка киоска."""

from __future__ import annotations

from app.config import Settings
from app.models.enums import GuideAgency, KioskId


def kiosk_pin_for(
    settings: Settings,
    agency: GuideAgency,
    kiosk_id: KioskId,
) -> str:
    if agency == GuideAgency.TRAVELTECH:
        mapping = {
            KioskId.POPOVA: settings.kiosk_pin_popova,
            KioskId.LOBACHEVSKY: settings.kiosk_pin_lobachevsky,
            KioskId.ROBOT: settings.kiosk_pin_robot,
            KioskId.RAMEEVA: settings.kiosk_pin_rameeva,
        }
    elif agency == GuideAgency.UMATOUR:
        mapping = {
            KioskId.POPOVA: settings.kiosk_pin_umatour_popova,
            KioskId.LOBACHEVSKY: settings.kiosk_pin_umatour_lobachevsky,
            KioskId.ROBOT: settings.kiosk_pin_umatour_robot,
            KioskId.RAMEEVA: settings.kiosk_pin_umatour_rameeva,
        }
    elif agency == GuideAgency.INNOTRAVEL:
        mapping = {
            KioskId.POPOVA: settings.kiosk_pin_innotravel_popova,
            KioskId.LOBACHEVSKY: settings.kiosk_pin_innotravel_lobachevsky,
            KioskId.ROBOT: settings.kiosk_pin_innotravel_robot,
            KioskId.RAMEEVA: settings.kiosk_pin_innotravel_rameeva,
        }
    else:
        raise ValueError(f"Unknown agency: {agency}")
    return mapping[kiosk_id]
