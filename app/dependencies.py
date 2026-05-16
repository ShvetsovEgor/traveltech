from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AppSession, SecurityService
from app.database import get_db
from app.services.redis_client import RedisStore

_redis: RedisStore | None = None
_security: SecurityService | None = None


async def init_dependencies(redis: RedisStore) -> None:
    global _redis, _security
    _redis = redis
    _security = SecurityService(redis)


async def shutdown_dependencies() -> None:
    global _redis, _security
    if _redis:
        await _redis.close()
    _redis = None
    _security = None


def get_redis() -> RedisStore:
    if _redis is None:
        raise RuntimeError("Redis not initialized")
    return _redis


def get_security() -> SecurityService:
    if _security is None:
        raise RuntimeError("SecurityService not initialized")
    return _security


async def require_interaction_token(
    interaction_token: Annotated[str | None, Header(alias="X-Interaction-Token")] = None,
    interaction_token_form: str | None = None,
) -> AppSession:
    token = interaction_token or interaction_token_form
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="interaction_token required",
        )
    security = get_security()
    return await security.get_app_session(token)


DbSession = Annotated[AsyncSession, Depends(get_db)]
RedisDep = Annotated[RedisStore, Depends(get_redis)]
SecurityDep = Annotated[SecurityService, Depends(get_security)]
