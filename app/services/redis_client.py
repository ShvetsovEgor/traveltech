from __future__ import annotations

import fnmatch
import json
import time
from typing import Any

import redis.asyncio as redis

from app.config import get_settings


class _MemoryClient:
    """In-process store for local dev when Redis is not installed."""

    def __init__(self) -> None:
        self._data: dict[str, tuple[str, float | None]] = {}

    def _purge(self, key: str) -> None:
        if key not in self._data:
            return
        _, expires = self._data[key]
        if expires is not None and time.time() >= expires:
            del self._data[key]

    async def setex(self, key: str, ttl: int, value: str) -> None:
        self._data[key] = (value, time.time() + ttl)

    async def set(self, key: str, value: str) -> None:
        self._data[key] = (value, None)

    async def get(self, key: str) -> str | None:
        self._purge(key)
        item = self._data.get(key)
        return item[0] if item else None

    async def delete(self, *keys: str) -> int:
        count = 0
        for key in keys:
            if key in self._data:
                del self._data[key]
                count += 1
        return count

    async def exists(self, key: str) -> int:
        self._purge(key)
        return 1 if key in self._data else 0

    async def scan(
        self,
        *,
        cursor: int = 0,
        match: str | None = None,
        count: int = 100,
    ) -> tuple[int, list[str]]:
        pattern = match or "*"
        keys = [k for k in list(self._data) if fnmatch.fnmatch(k, pattern)]
        return 0, keys[:count]

    async def aclose(self) -> None:
        self._data.clear()


class RedisStore:
    def __init__(self, client: redis.Redis | _MemoryClient) -> None:
        self.client = client

    @classmethod
    async def create(cls) -> RedisStore:
        settings = get_settings()
        if settings.redis_url.startswith("memory://"):
            return cls(_MemoryClient())
        client = redis.from_url(settings.redis_url, decode_responses=True)
        return cls(client)

    async def close(self) -> None:
        await self.client.aclose()

    async def set_json(
        self,
        key: str,
        value: Any,
        *,
        ttl_seconds: int | None = None,
    ) -> None:
        payload = json.dumps(value, ensure_ascii=False)
        if ttl_seconds:
            await self.client.setex(key, ttl_seconds, payload)
        else:
            await self.client.set(key, payload)

    async def get_json(self, key: str) -> Any | None:
        raw = await self.client.get(key)
        if raw is None:
            return None
        return json.loads(raw)

    async def delete(self, *keys: str) -> None:
        if keys:
            await self.client.delete(*keys)

    async def set_cancel_flag(self, task_id: str) -> None:
        await self.client.setex(f"task:cancel:{task_id}", 3600, "1")

    async def is_cancelled(self, task_id: str) -> bool:
        return bool(await self.client.exists(f"task:cancel:{task_id}"))
