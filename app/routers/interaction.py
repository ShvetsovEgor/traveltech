from fastapi import APIRouter

from app.dependencies import DbSession, SecurityDep
from app.models.pydantic_schemas import (
    HeartbeatRequest,
    HeartbeatResponse,
    InteractionStartRequest,
    InteractionStartResponse,
)
from app.services.audit import write_audit

router = APIRouter()


@router.post("/start", response_model=InteractionStartResponse)
async def start_interaction(
    body: InteractionStartRequest,
    security: SecurityDep,
    db: DbSession,
) -> InteractionStartResponse:
    session = await security.start_interaction(body.kiosk_token, body.app_type)
    await write_audit(
        db,
        "interaction_start",
        interaction_token=session.interaction_token,
        message=f"app_type={session.app_type.value}",
    )
    return InteractionStartResponse(
        interaction_token=session.interaction_token,
        app_type=session.app_type,
        last_active_time_msk=session.last_active_time_msk,
    )


@router.post("/heartbeat", response_model=HeartbeatResponse)
async def heartbeat(
    body: HeartbeatRequest,
    security: SecurityDep,
) -> HeartbeatResponse:
    session = await security.heartbeat(body.interaction_token)
    return HeartbeatResponse(
        interaction_token=session.interaction_token,
        last_active_time_msk=session.last_active_time_msk,
    )
