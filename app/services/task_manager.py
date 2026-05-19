"""
Background generation tasks.
Blocking ai_services calls run in a thread pool; status is stored in Redis + SQLite.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.storage import cleanup_upload_file, result_path, result_url
from app.core.timezone import msk_iso, now_msk
from app.models.enums import AppType, TaskStatus
from app.models.sqlalchemy_models import GenerationTaskRecord
from app.services.redis_client import RedisStore

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="ai-worker")


class TaskManager:
    TASK_KEY = "task:{task_id}"

    def __init__(self, redis: RedisStore) -> None:
        self.redis = redis

    async def create_task(
        self,
        db: AsyncSession,
        *,
        interaction_token: str,
        app_type: AppType,
    ) -> str:
        task_id = uuid.uuid4().hex
        now = now_msk()
        record = GenerationTaskRecord(
            task_id=task_id,
            interaction_token=interaction_token,
            app_type=app_type.value,
            status=TaskStatus.PROCESSING.value,
            created_at_msk=now,
            updated_at_msk=now,
        )
        db.add(record)
        await db.commit()

        await self._set_task_state(
            task_id,
            {
                "task_id": task_id,
                "interaction_token": interaction_token,
                "status": TaskStatus.PROCESSING.value,
                "result_url": None,
                "error_message": None,
                "updated_at_msk": msk_iso(now),
            },
        )
        return task_id

    async def get_task_status(self, task_id: str) -> dict[str, Any] | None:
        return await self.redis.get_json(self.TASK_KEY.format(task_id=task_id))

    async def cancel_task(self, task_id: str) -> None:
        await self.redis.set_cancel_flag(task_id)
        state = await self.get_task_status(task_id)
        if state and state.get("status") == TaskStatus.PROCESSING.value:
            state["status"] = TaskStatus.CANCELLED.value
            state["updated_at_msk"] = msk_iso(now_msk())
            state["error_message"] = "Cancelled: interaction session closed"
            await self._set_task_state(task_id, state)

    async def _set_task_state(self, task_id: str, state: dict[str, Any]) -> None:
        await self.redis.set_json(self.TASK_KEY.format(task_id=task_id), state, ttl_seconds=86400)

    async def _update_status(
        self,
        db: AsyncSession,
        task_id: str,
        status: TaskStatus,
        *,
        result_path_value: str | None = None,
        error_message: str | None = None,
    ) -> dict[str, Any]:
        now = now_msk()
        result = await db.execute(
            select(GenerationTaskRecord).where(GenerationTaskRecord.task_id == task_id)
        )
        record = result.scalar_one_or_none()
        if record:
            record.status = status.value
            record.updated_at_msk = now
            if result_path_value:
                record.result_path = result_path_value
            if error_message:
                record.error_message = error_message
            await db.commit()

        ext = Path(result_path_value).suffix if result_path_value else ".jpeg"
        url = result_url(task_id, ext) if status == TaskStatus.COMPLETED else None

        state = {
            "task_id": task_id,
            "status": status.value,
            "result_url": url,
            "error_message": error_message,
            "updated_at_msk": msk_iso(now),
        }
        existing = await self.get_task_status(task_id)
        if existing:
            state["interaction_token"] = existing.get("interaction_token")
        await self._set_task_state(task_id, state)
        return state

    def schedule_image_generation(
        self,
        *,
        task_id: str,
        interaction_token: str,
        input_path: Path,
        prompt: str,
        db_factory,
    ) -> None:
        asyncio.create_task(
            self._run_image_task(
                task_id=task_id,
                interaction_token=interaction_token,
                input_path=input_path,
                prompt=prompt,
                db_factory=db_factory,
            )
        )

    def schedule_video_generation(
        self,
        *,
        task_id: str,
        interaction_token: str,
        input_path: Path,
        prompt: str,
        db_factory,
    ) -> None:
        asyncio.create_task(
            self._run_video_task(
                task_id=task_id,
                interaction_token=interaction_token,
                input_path=input_path,
                prompt=prompt,
                db_factory=db_factory,
            )
        )

    async def _run_image_task(
        self,
        *,
        task_id: str,
        interaction_token: str,
        input_path: Path,
        prompt: str,
        db_factory,
    ) -> None:
        out = result_path(task_id, ".jpeg")
        try:
            if await self.redis.is_cancelled(task_id):
                return
            loop = asyncio.get_running_loop()
            success = await loop.run_in_executor(
                _executor,
                _call_generate_stylized_image,
                str(input_path),
                prompt,
                str(out),
            )
            if await self.redis.is_cancelled(task_id):
                return
            async with db_factory() as db:
                if success:
                    await self._update_status(
                        db, task_id, TaskStatus.COMPLETED, result_path_value=str(out)
                    )
                else:
                    await self._update_status(
                        db,
                        task_id,
                        TaskStatus.FAILED,
                        error_message="Image generation failed",
                    )
        except Exception as exc:
            logger.exception("Image task %s failed", task_id)
            async with db_factory() as db:
                await self._update_status(
                    db, task_id, TaskStatus.FAILED, error_message=str(exc)
                )
        finally:
            cleanup_upload_file(input_path)

    async def _run_video_task(
        self,
        *,
        task_id: str,
        interaction_token: str,
        input_path: Path,
        prompt: str,
        db_factory,
    ) -> None:
        out = result_path(task_id, ".mp4")
        try:
            if await self.redis.is_cancelled(task_id):
                return
            loop = asyncio.get_running_loop()
            success, gen_error = await loop.run_in_executor(
                _executor,
                _call_generate_video_from_image,
                str(input_path),
                prompt,
                str(out),
            )
            if await self.redis.is_cancelled(task_id):
                return
            async with db_factory() as db:
                if success:
                    await self._update_status(
                        db, task_id, TaskStatus.COMPLETED, result_path_value=str(out)
                    )
                else:
                    await self._update_status(
                        db,
                        task_id,
                        TaskStatus.FAILED,
                        error_message=gen_error or "Генерация видео не удалась",
                    )
        except Exception as exc:
            logger.exception("Video task %s failed", task_id)
            async with db_factory() as db:
                await self._update_status(
                    db, task_id, TaskStatus.FAILED, error_message=str(exc)
                )
        finally:
            cleanup_upload_file(input_path)


def _call_generate_stylized_image(
    input_image_path: str,
    prompt: str,
    output_image_path: str,
) -> bool:
    from ai_services import generate_stylized_image

    return generate_stylized_image(
        input_image_path=input_image_path,
        prompt=prompt,
        output_image_path=output_image_path,
    )


def _call_generate_video_from_image(
    input_image_path: str,
    prompt: str,
    output_video_path: str,
) -> tuple[bool, str | None]:
    from ai_services import generate_video_from_image

    return generate_video_from_image(
        input_image_path=input_image_path,
        prompt=prompt,
        output_video_path=output_video_path,
    )
