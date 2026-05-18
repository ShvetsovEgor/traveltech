from pydantic import BaseModel, Field

from app.models.enums import AppType, KioskId, TaskStatus


# --- Auth & sessions ---


class LoginRequest(BaseModel):
    pin: str = Field(..., min_length=4, max_length=12)
    kiosk_id: KioskId


class LoginResponse(BaseModel):
    kiosk_token: str
    kiosk_id: KioskId
    expires_at_msk: str


class KioskStatusResponse(BaseModel):
    active: bool
    kiosk_id: KioskId
    kiosk_token: str | None = None
    expires_at_msk: str | None = None


class LogoutRequest(BaseModel):
    kiosk_token: str


class LogoutResponse(BaseModel):
    ok: bool = True
    kiosk_id: KioskId


class InteractionStartRequest(BaseModel):
    kiosk_token: str
    app_type: AppType


class InteractionStartResponse(BaseModel):
    interaction_token: str
    app_type: AppType
    last_active_time_msk: str


class HeartbeatRequest(BaseModel):
    interaction_token: str


class HeartbeatResponse(BaseModel):
    interaction_token: str
    last_active_time_msk: str


# --- Generation ---


class GenerateTaskResponse(BaseModel):
    task_id: str


class TaskStatusResponse(BaseModel):
    task_id: str
    status: TaskStatus
    result_url: str | None = None
    error_message: str | None = None
    updated_at_msk: str | None = None
