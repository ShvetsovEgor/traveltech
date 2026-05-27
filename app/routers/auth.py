from fastapi import APIRouter, Query

from app.config import get_settings
from app.core.app_events_log import append_app_event
from app.dependencies import DbSession, SecurityDep
from app.models.enums import KioskId
from app.models.pydantic_schemas import (
    KioskStatusResponse,
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    LogoutResponse,
)
from app.services.audit import write_audit

router = APIRouter()


@router.get("/status", response_model=KioskStatusResponse)
async def kiosk_status(
    security: SecurityDep,
    kiosk_id: KioskId = Query(..., description="ID киоска из ?location="),
) -> KioskStatusResponse:
    data = await security.get_kiosk_slot_status(kiosk_id)
    return KioskStatusResponse(
        active=data["active"],
        kiosk_id=kiosk_id,
        kiosk_token=data.get("kiosk_token"),
        expires_at_msk=data.get("expires_at_msk"),
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    security: SecurityDep,
    db: DbSession,
) -> LoginResponse:
    auth = await security.login(body.pin, body.kiosk_id)
    append_app_event(
        log_path=get_settings().app_events_log_path,
        event_type="kiosk_login",
        payload={
            "kiosk_id": body.kiosk_id.value,
            "expires_at_msk": auth.expires_at_msk,
        },
    )
    await write_audit(
        db,
        "kiosk_login",
        kiosk_id=body.kiosk_id.value,
        message=f"Kiosk auth until {auth.expires_at_msk}",
    )
    return LoginResponse(
        kiosk_token=auth.kiosk_token,
        kiosk_id=auth.kiosk_id,
        expires_at_msk=auth.expires_at_msk,
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    body: LogoutRequest,
    security: SecurityDep,
    db: DbSession,
) -> LogoutResponse:
    kiosk_id = await security.logout_kiosk(body.kiosk_token)
    append_app_event(
        log_path=get_settings().app_events_log_path,
        event_type="kiosk_logout",
        payload={
            "kiosk_id": kiosk_id.value,
        },
    )
    await write_audit(
        db,
        "kiosk_logout",
        kiosk_id=kiosk_id.value,
        message="Kiosk session ended by guide",
    )
    return LogoutResponse(ok=True, kiosk_id=kiosk_id)
