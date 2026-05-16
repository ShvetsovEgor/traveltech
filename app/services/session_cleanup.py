"""Background loop: expire interactions without heartbeat > 2 minutes."""

from __future__ import annotations

import asyncio
import logging

from app.config import get_settings
from app.core.security import SecurityService
from app.services.redis_client import RedisStore

logger = logging.getLogger(__name__)


async def session_cleanup_loop(
    redis: RedisStore,
    security: SecurityService,
    *,
    stop_event: asyncio.Event,
) -> None:
    settings = get_settings()
    while not stop_event.is_set():
        try:
            await _sweep_stale_interactions(redis, security)
        except Exception:
            logger.exception("Session cleanup sweep failed")
        try:
            await asyncio.wait_for(
                stop_event.wait(),
                timeout=settings.session_cleanup_interval_seconds,
            )
        except asyncio.TimeoutError:
            pass


async def _sweep_stale_interactions(
    redis: RedisStore,
    security: SecurityService,
) -> None:
    """Scan interaction keys and revoke those past heartbeat deadline."""
    settings = get_settings()
    cursor = 0
    pattern = "interaction:*"
    while True:
        cursor, keys = await redis.client.scan(
            cursor=cursor,
            match=pattern,
            count=100,
        )
        for key in keys:
            if key.endswith(":tasks"):
                continue
            token = key.split(":", 1)[-1]
            data = await redis.get_json(key)
            if not data:
                continue
            from app.core.timezone import add_seconds_msk, to_msk

            last_active = to_msk(data.get("last_active_time_msk", ""))
            deadline = add_seconds_msk(-settings.interaction_heartbeat_timeout_seconds)
            if last_active < deadline:
                logger.info("Revoking stale interaction %s", token[:8])
                await security.revoke_interaction(token)
        if cursor == 0:
            break
