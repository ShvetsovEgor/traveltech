"""
Two-level authorization:
  1. KioskAuth — global kiosk_token (8h TTL, PIN login)
  2. AppSession — interaction_token per screen (2min heartbeat)
"""

from __future__ import annotations

import secrets
from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, status

from app.config import Settings, get_settings
from app.core.timezone import add_hours_msk, add_seconds_msk, is_expired, msk_iso, now_msk, to_msk
from app.models.enums import AppType, KioskId
from app.services.redis_client import RedisStore


def _token() -> str:
    return secrets.token_urlsafe(32)


@dataclass
class KioskAuth:
    kiosk_token: str
    kiosk_id: KioskId
    expires_at_msk: str  # ISO in MSK

    def to_dict(self) -> dict[str, Any]:
        return {
            "kiosk_token": self.kiosk_token,
            "kiosk_id": self.kiosk_id.value,
            "expires_at_msk": self.expires_at_msk,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> KioskAuth:
        return cls(
            kiosk_token=data["kiosk_token"],
            kiosk_id=KioskId(data["kiosk_id"]),
            expires_at_msk=data["expires_at_msk"],
        )


@dataclass
class AppSession:
    interaction_token: str
    app_type: AppType
    kiosk_token: str
    last_active_time_msk: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "interaction_token": self.interaction_token,
            "app_type": self.app_type.value,
            "kiosk_token": self.kiosk_token,
            "last_active_time_msk": self.last_active_time_msk,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> AppSession:
        return cls(
            interaction_token=data["interaction_token"],
            app_type=AppType(data["app_type"]),
            kiosk_token=data["kiosk_token"],
            last_active_time_msk=data["last_active_time_msk"],
        )


class SecurityService:
    KIOSK_KEY = "kiosk:{token}"
    KIOSK_SLOT_KEY = "kiosk_slot:{kiosk_id}"
    INTERACTION_KEY = "interaction:{token}"
    INTERACTION_TASKS_KEY = "interaction:{token}:tasks"

    def __init__(self, redis: RedisStore, settings: Settings | None = None) -> None:
        self.redis = redis
        self.settings = settings or get_settings()

    def _pin_for_kiosk(self, kiosk_id: KioskId) -> str:
        mapping = {
            KioskId.POPOVA: self.settings.kiosk_pin_popova,
            KioskId.LOBACHEVSKY: self.settings.kiosk_pin_lobachevsky,
            KioskId.ROBOT: self.settings.kiosk_pin_robot,
        }
        return mapping[kiosk_id]

    async def login(self, pin: str, kiosk_id: KioskId) -> KioskAuth:
        if pin != self._pin_for_kiosk(kiosk_id):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid PIN for this kiosk",
            )
        kiosk_token = _token()
        expires = add_hours_msk(self.settings.kiosk_token_ttl_hours)
        auth = KioskAuth(
            kiosk_token=kiosk_token,
            kiosk_id=kiosk_id,
            expires_at_msk=msk_iso(expires),
        )
        ttl_seconds = int(self.settings.kiosk_token_ttl_hours * 3600)
        await self.redis.set_json(
            self.KIOSK_KEY.format(token=kiosk_token),
            auth.to_dict(),
            ttl_seconds=ttl_seconds,
        )
        await self.redis.set_json(
            self.KIOSK_SLOT_KEY.format(kiosk_id=kiosk_id.value),
            auth.to_dict(),
            ttl_seconds=ttl_seconds,
        )
        return auth

    async def get_kiosk_slot_status(self, kiosk_id: KioskId) -> dict[str, Any]:
        """Статус киоска для polling с экрана ожидания (после входа гида с телефона)."""
        key = self.KIOSK_SLOT_KEY.format(kiosk_id=kiosk_id.value)
        data = await self.redis.get_json(key)
        if not data:
            return {"active": False, "kiosk_id": kiosk_id.value}
        auth = KioskAuth.from_dict(data)
        if is_expired(to_msk(auth.expires_at_msk)):
            await self.redis.delete(
                key,
                self.KIOSK_KEY.format(token=auth.kiosk_token),
            )
            return {"active": False, "kiosk_id": kiosk_id.value}
        return {
            "active": True,
            "kiosk_id": auth.kiosk_id.value,
            "kiosk_token": auth.kiosk_token,
            "expires_at_msk": auth.expires_at_msk,
        }

    async def get_kiosk_auth(self, kiosk_token: str) -> KioskAuth:
        data = await self.redis.get_json(self.KIOSK_KEY.format(token=kiosk_token))
        if not data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired kiosk_token",
            )
        auth = KioskAuth.from_dict(data)
        if is_expired(to_msk(auth.expires_at_msk)):
            await self.redis.delete(self.KIOSK_KEY.format(token=kiosk_token))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="kiosk_token expired",
            )
        return auth

    async def start_interaction(
        self,
        kiosk_token: str,
        app_type: AppType,
    ) -> AppSession:
        await self.get_kiosk_auth(kiosk_token)
        interaction_token = _token()
        now = msk_iso(now_msk())
        session = AppSession(
            interaction_token=interaction_token,
            app_type=app_type,
            kiosk_token=kiosk_token,
            last_active_time_msk=now,
        )
        # TTL slightly above heartbeat window for Redis auto-expiry
        ttl = self.settings.interaction_heartbeat_timeout_seconds + 60
        await self.redis.set_json(
            self.INTERACTION_KEY.format(token=interaction_token),
            session.to_dict(),
            ttl_seconds=ttl,
        )
        await self.redis.set_json(
            self.INTERACTION_TASKS_KEY.format(token=interaction_token),
            [],
            ttl_seconds=ttl,
        )
        return session

    async def heartbeat(self, interaction_token: str) -> AppSession:
        session = await self.get_app_session(interaction_token)
        session.last_active_time_msk = msk_iso(now_msk())
        ttl = self.settings.interaction_heartbeat_timeout_seconds + 60
        await self.redis.set_json(
            self.INTERACTION_KEY.format(token=interaction_token),
            session.to_dict(),
            ttl_seconds=ttl,
        )
        return session

    async def get_app_session(self, interaction_token: str) -> AppSession:
        data = await self.redis.get_json(
            self.INTERACTION_KEY.format(token=interaction_token)
        )
        if not data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired interaction_token",
            )
        session = AppSession.from_dict(data)
        last_active = to_msk(session.last_active_time_msk)
        deadline = add_seconds_msk(-self.settings.interaction_heartbeat_timeout_seconds)
        if last_active < deadline:
            await self.revoke_interaction(interaction_token)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="interaction_token expired (no heartbeat)",
            )
        return session

    async def register_task_for_interaction(
        self, interaction_token: str, task_id: str
    ) -> None:
        key = self.INTERACTION_TASKS_KEY.format(token=interaction_token)
        raw = await self.redis.get_json(key)
        tasks: list[str] = raw if isinstance(raw, list) else []
        if task_id not in tasks:
            tasks.append(task_id)
        ttl = self.settings.interaction_heartbeat_timeout_seconds + 3600
        await self.redis.set_json(key, tasks, ttl_seconds=ttl)

    async def get_interaction_task_ids(self, interaction_token: str) -> list[str]:
        key = self.INTERACTION_TASKS_KEY.format(token=interaction_token)
        raw = await self.redis.get_json(key)
        return raw if isinstance(raw, list) else []

    async def revoke_interaction(self, interaction_token: str) -> None:
        """Remove session, cancel tasks, delete temp uploads."""
        from app.core.storage import cleanup_upload_dir
        from app.services.task_manager import TaskManager

        task_ids = await self.get_interaction_task_ids(interaction_token)
        task_manager = TaskManager(self.redis)
        for task_id in task_ids:
            await task_manager.cancel_task(task_id)

        await self.redis.delete(
            self.INTERACTION_KEY.format(token=interaction_token),
            self.INTERACTION_TASKS_KEY.format(token=interaction_token),
        )
        cleanup_upload_dir(interaction_token)
