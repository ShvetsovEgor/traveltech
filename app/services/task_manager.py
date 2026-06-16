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
from app.core.app_events_log import append_app_event
from app.core.generation_log import append_generation_log
from app.core.guide_agencies import resolve_agency_for_interaction
from app.core.prompt_engine import PromptEngine
from app.core.storage import (
    cleanup_upload_file,
    result_path,
    result_url,
    sticker_preview_path,
    sticker_preview_url,
    results_dir,
)
from app.core.timezone import msk_iso, now_msk
from app.models.enums import AppType, TaskStatus
from app.models.sqlalchemy_models import GenerationTaskRecord
from app.services.redis_client import RedisStore

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="ai-worker")


def _generation_media_type(app_type: str) -> str:
    if app_type == AppType.VIDEO_MAGIC.value:
        return "video"
    return "photo"


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
        generation_style: str | None = None,
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

        state_payload: dict[str, Any] = {
                "task_id": task_id,
                "interaction_token": interaction_token,
                "status": TaskStatus.PROCESSING.value,
                "result_url": None,
                "error_message": None,
                "updated_at_msk": msk_iso(now),
            }
        if app_type == AppType.STICKER_PACK:
            state_payload.update(
                {
                    "sticker_total": len(PromptEngine.list_sticker_emotions()),
                    "sticker_progress": 0,
                    "sticker_previews": [],
                }
            )
        if generation_style:
            state_payload["generation_style"] = generation_style
        await self._set_task_state(task_id, state_payload)
        processing_payload: dict[str, Any] = {
            "task_id": task_id,
            "interaction_token": interaction_token,
            "app_type": app_type.value,
            "status": TaskStatus.PROCESSING.value,
        }
        if generation_style:
            processing_payload["generation_style"] = generation_style
        append_app_event(
            log_path=get_settings().app_events_log_path,
            event_type="generation_status",
            payload=processing_payload,
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

    async def _log_successful_generation(
        self,
        *,
        task_id: str,
        interaction_token: str,
        app_type: str,
        media_type: str,
        at_msk: str,
        generation_style: str = "",
    ) -> None:
        agency_id, agency_label = await resolve_agency_for_interaction(
            self.redis,
            interaction_token,
        )
        settings = get_settings()
        append_generation_log(
            log_path=settings.generation_log_path,
            at_msk=at_msk,
            media_type=media_type,
            app_type=app_type,
            task_id=task_id,
            agency_id=agency_id,
            agency_label=agency_label,
            style=generation_style,
        )
        append_app_event(
            log_path=settings.app_events_log_path,
            event_type="generation_status",
            payload={
                "task_id": task_id,
                "interaction_token": interaction_token,
                "app_type": app_type,
                "media_type": media_type,
                "status": TaskStatus.COMPLETED.value,
                "agency_id": agency_id,
                "agency": agency_label,
                "generation_style": generation_style,
            },
        )
        logger.info(
            "Generation completed: type=%s app=%s style=%s agency=%s task_id=%s",
            media_type,
            app_type,
            generation_style or "-",
            agency_label,
            task_id,
        )

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
            if status == TaskStatus.COMPLETED:
                at = msk_iso(now)
                media_type = _generation_media_type(record.app_type)
                existing = await self.get_task_status(task_id)
                generation_style = str((existing or {}).get("generation_style", ""))
                await self._log_successful_generation(
                    task_id=task_id,
                    interaction_token=record.interaction_token,
                    app_type=record.app_type,
                    media_type=media_type,
                    at_msk=at,
                    generation_style=generation_style,
                )
            elif status in (TaskStatus.FAILED, TaskStatus.CANCELLED):
                append_app_event(
                    log_path=get_settings().app_events_log_path,
                    event_type="generation_status",
                    payload={
                        "task_id": task_id,
                        "interaction_token": record.interaction_token,
                        "app_type": record.app_type,
                        "status": status.value,
                        "error_message": error_message or "",
                    },
                )

        ext = Path(result_path_value).suffix if result_path_value else ".jpeg"
        url = result_url(task_id, ext) if status == TaskStatus.COMPLETED else None

        existing = await self.get_task_status(task_id)
        state: dict[str, Any] = {
            "task_id": task_id,
            "status": status.value,
            "result_url": url,
            "error_message": error_message,
            "updated_at_msk": msk_iso(now),
        }
        if existing:
            state["interaction_token"] = existing.get("interaction_token")
            for key in (
                "sticker_previews",
                "sticker_progress",
                "sticker_total",
                "sticker_pack_url",
                "generation_style",
            ):
                if key in existing:
                    state[key] = existing[key]
        await self._set_task_state(task_id, state)
        return state

    async def _update_sticker_pack_progress(
        self,
        task_id: str,
        *,
        previews: list[dict[str, str]],
        progress: int,
        total: int,
    ) -> None:
        existing = await self.get_task_status(task_id) or {}
        state: dict[str, Any] = {
            **existing,
            "task_id": task_id,
            "status": TaskStatus.PROCESSING.value,
            "sticker_previews": previews,
            "sticker_progress": progress,
            "sticker_total": total,
            "updated_at_msk": msk_iso(now_msk()),
        }
        await self._set_task_state(task_id, state)

    async def _update_sticker_pack_status(
        self,
        db: AsyncSession,
        task_id: str,
        *,
        pack_url: str,
        previews: list[dict[str, str]],
        result_path_value: str,
    ) -> dict[str, Any]:
        now = now_msk()
        result = await db.execute(
            select(GenerationTaskRecord).where(GenerationTaskRecord.task_id == task_id)
        )
        record = result.scalar_one_or_none()
        if record:
            record.status = TaskStatus.COMPLETED.value
            record.updated_at_msk = now
            record.result_path = result_path_value
            await db.commit()
            at = msk_iso(now)
            existing = await self.get_task_status(task_id)
            generation_style = str((existing or {}).get("generation_style", ""))
            await self._log_successful_generation(
                task_id=task_id,
                interaction_token=record.interaction_token,
                app_type=record.app_type,
                media_type="photo",
                at_msk=at,
                generation_style=generation_style,
            )

        state = {
            "task_id": task_id,
            "status": TaskStatus.COMPLETED.value,
            "result_url": pack_url,
            "sticker_pack_url": pack_url,
            "sticker_previews": previews,
            "sticker_progress": len(previews),
            "sticker_total": len(previews),
            "error_message": None,
            "updated_at_msk": msk_iso(now),
        }
        existing = await self.get_task_status(task_id)
        if existing:
            state["interaction_token"] = existing.get("interaction_token")
            if existing.get("generation_style"):
                state["generation_style"] = existing["generation_style"]
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
        fallback_prompt: str | None = None,
    ) -> None:
        asyncio.create_task(
            self._run_image_task(
                task_id=task_id,
                interaction_token=interaction_token,
                input_path=input_path,
                prompt=prompt,
                fallback_prompt=fallback_prompt,
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

    def schedule_sticker_pack_generation(
        self,
        *,
        task_id: str,
        interaction_token: str,
        input_path: Path,
        db_factory,
    ) -> None:
        asyncio.create_task(
            self._run_sticker_pack_task(
                task_id=task_id,
                interaction_token=interaction_token,
                input_path=input_path,
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
        fallback_prompt: str | None = None,
    ) -> None:
        out = result_path(task_id, ".jpeg")
        _, agency_label = await resolve_agency_for_interaction(
            self.redis,
            interaction_token,
        )
        try:
            if await self.redis.is_cancelled(task_id):
                return
            loop = asyncio.get_running_loop()
            success, gen_error = await loop.run_in_executor(
                _executor,
                _call_generate_stylized_image,
                str(input_path),
                prompt,
                str(out),
                agency_label,
                fallback_prompt,
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
                        error_message=gen_error or "Image generation failed",
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
        _, agency_label = await resolve_agency_for_interaction(
            self.redis,
            interaction_token,
        )
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
                agency_label,
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

    async def _run_sticker_pack_task(
        self,
        *,
        task_id: str,
        interaction_token: str,
        input_path: Path,
        db_factory,
    ) -> None:
        emotions = PromptEngine.list_sticker_emotions()
        total = len(emotions)
        sticker_files: list[tuple[Path, str]] = []
        previews: list[dict[str, str]] = []
        task_folder = results_dir() / task_id
        task_folder.mkdir(parents=True, exist_ok=True)
        _, agency_label = await resolve_agency_for_interaction(
            self.redis,
            interaction_token,
        )

        try:
            if await self.redis.is_cancelled(task_id):
                return
            loop = asyncio.get_running_loop()

            grid_out = task_folder / "grid.jpeg"
            grid_prompt = PromptEngine.build_sticker_grid_prompt()
            success, gen_error = await loop.run_in_executor(
                _executor,
                _call_generate_stylized_image,
                str(input_path),
                grid_prompt,
                str(grid_out),
                agency_label,
            )
            if not success:
                async with db_factory() as db:
                    await self._update_status(
                        db,
                        task_id,
                        TaskStatus.FAILED,
                        error_message=gen_error or "Не удалось сгенерировать стикерпак",
                    )
                return

            raw_paths = [str(task_folder / f"{emotion_id}.jpeg") for emotion_id, _, _ in emotions]
            await loop.run_in_executor(
                _executor,
                _split_sticker_grid,
                str(grid_out),
                raw_paths,
            )

            for emotion_id, label, emoji in emotions:
                if await self.redis.is_cancelled(task_id):
                    return

                raw_out = task_folder / f"{emotion_id}.jpeg"
                webp_out = sticker_preview_path(task_id, emotion_id)
                await loop.run_in_executor(
                    _executor,
                    _prepare_sticker_webp,
                    raw_out,
                    webp_out,
                )
                sticker_files.append((webp_out, emoji))
                previews.append(
                    {
                        "emotion_id": emotion_id,
                        "label": label,
                        "emoji": emoji,
                        "url": sticker_preview_url(task_id, emotion_id),
                    }
                )
                await self._update_sticker_pack_progress(
                    task_id,
                    previews=previews,
                    progress=len(previews),
                    total=total,
                )

            if await self.redis.is_cancelled(task_id):
                return

            logger.info(
                "Publishing sticker pack to Telegram for task %s (%d stickers)",
                task_id,
                len(sticker_files),
            )
            pack_url = await asyncio.wait_for(
                loop.run_in_executor(
                    _executor,
                    _publish_sticker_pack,
                    task_id,
                    sticker_files,
                ),
                timeout=120.0,
            )

            async with db_factory() as db:
                await self._update_sticker_pack_status(
                    db,
                    task_id,
                    pack_url=pack_url,
                    previews=previews,
                    result_path_value=str(task_folder),
                )
        except asyncio.TimeoutError:
            logger.error("Sticker pack Telegram publish timed out for task %s", task_id)
            async with db_factory() as db:
                await self._update_status(
                    db,
                    task_id,
                    TaskStatus.FAILED,
                    error_message="Публикация в Telegram заняла слишком много времени",
                )
        except Exception as exc:
            logger.exception("Sticker pack task %s failed", task_id)
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
    agency_label: str,
    fallback_prompt: str | None = None,
) -> tuple[bool, str | None]:
    from ai_services import generate_stylized_image

    return generate_stylized_image(
        input_image_path=input_image_path,
        prompt=prompt,
        output_image_path=output_image_path,
        agency_label=agency_label,
        fallback_prompt=fallback_prompt,
    )


def _call_generate_video_from_image(
    input_image_path: str,
    prompt: str,
    output_video_path: str,
    agency_label: str,
) -> tuple[bool, str | None]:
    from ai_services import generate_video_from_image

    return generate_video_from_image(
        input_image_path=input_image_path,
        prompt=prompt,
        output_video_path=output_video_path,
        agency_label=agency_label,
    )


def _prepare_sticker_webp(input_path: Path, output_path: Path) -> None:
    from app.services.sticker_image import prepare_sticker_webp

    prepare_sticker_webp(input_path, output_path)


def _split_sticker_grid(grid_path: str, output_paths: list[str]) -> None:
    from app.services.sticker_image import split_sticker_grid

    split_sticker_grid(Path(grid_path), [Path(p) for p in output_paths])


def _publish_sticker_pack(
    task_id: str,
    sticker_files: list[tuple[Path, str]],
) -> str:
    from app.services.sticker_telegram import StickerTelegramError, StickerTelegramService

    try:
        service = StickerTelegramService()
        return service.publish_pack(task_id=task_id, sticker_files=sticker_files)
    except StickerTelegramError as exc:
        raise RuntimeError(str(exc)) from exc
