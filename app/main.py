"""
TravelTech Kiosk API — FastAPI application entrypoint.

Run: uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
"""

from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.core.storage import result_url
from app.core.prompt_loader import load_prompts_catalog, prompts_file_path
from app.core.security import SecurityService
from app.models.enums import KioskId
from app.database import init_db
from app.dependencies import init_dependencies, shutdown_dependencies
from app.routers import api_router
from app.services.redis_client import RedisStore
from app.services.session_cleanup import session_cleanup_loop

logger = logging.getLogger(__name__)


def _read_app_events(log_path: str) -> list[dict[str, Any]]:
    path = Path(log_path)
    if not path.exists():
        return []
    events: list[dict[str, Any]] = []
    try:
        for raw in path.read_text(encoding="utf-8").splitlines():
            if not raw.strip():
                continue
            try:
                item = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if isinstance(item, dict):
                events.append(item)
    except OSError:
        logger.exception("Failed to read app events log from %s", path)
        return []
    return events


def _read_generation_dashboard(events: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Parse append-only generation log (TSV) and return aggregates.
    Format: <ts>\ttype=<photo|video>\tapp=<...>\ttask_id=<...>
    """
    photo = 0
    video = 0
    last_events: list[dict[str, str]] = []
    recent_media: list[dict[str, str]] = []
    by_hour: dict[str, dict[str, int]] = {}
    by_day: dict[str, dict[str, int]] = {}
    for event in events:
        if event.get("event_type") != "generation_status":
            continue
        payload = event.get("payload") or {}
        if not isinstance(payload, dict):
            continue
        if payload.get("status") != "completed":
            continue
        at_msk = str(event.get("at_msk", ""))
        media_type = str(payload.get("media_type", ""))
        if media_type == "photo":
            photo += 1
        elif media_type == "video":
            video += 1
        else:
            continue

        try:
            dt = datetime.fromisoformat(at_msk)
            hour_key = dt.replace(minute=0, second=0, microsecond=0).isoformat()
            day_key = dt.date().isoformat()
        except ValueError:
            hour_key = ""
            day_key = ""

        if hour_key:
            hour_bucket = by_hour.setdefault(hour_key, {"photo": 0, "video": 0, "total": 0})
            hour_bucket[media_type] += 1
            hour_bucket["total"] += 1

        if day_key:
            day_bucket = by_day.setdefault(day_key, {"photo": 0, "video": 0, "total": 0})
            day_bucket[media_type] += 1
            day_bucket["total"] += 1

        task_id = str(payload.get("task_id", ""))
        ext = ".mp4" if media_type == "video" else ".jpeg"
        media_url = result_url(task_id, ext) if task_id else ""

        entry = {
            "at_msk": at_msk,
            "type": media_type or "",
            "app_type": str(payload.get("app_type", "")),
            "task_id": task_id,
            "result_url": media_url,
        }
        last_events.append(entry)
        recent_media.append(entry)

    return {
        "total": photo + video,
        "photo": photo,
        "video": video,
        "last_events": last_events[-10:],
        "recent_media": list(reversed(recent_media[-24:])),
        "series": {
            # 48 hourly points and 30 daily points for charts.
            "by_hour": [
                {"at_msk": key, **stats}
                for key, stats in sorted(by_hour.items())[-48:]
            ],
            "by_day": [
                {"date_msk": key, **stats}
                for key, stats in sorted(by_day.items())[-30:]
            ],
        },
    }


def _build_kiosk_dashboard_from_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    states: dict[str, dict[str, Any]] = {
        kiosk_id.value: {
            "kiosk_id": kiosk_id.value,
            "status": "Waiting",
            "active": False,
            "expires_at_msk": None,
            "last_event_at_msk": None,
        }
        for kiosk_id in KioskId
    }

    for event in events:
        event_type = event.get("event_type")
        payload = event.get("payload") or {}
        if event_type not in ("kiosk_login", "kiosk_logout") or not isinstance(payload, dict):
            continue
        kiosk_id = str(payload.get("kiosk_id", ""))
        if kiosk_id not in states:
            continue
        state = states[kiosk_id]
        state["last_event_at_msk"] = event.get("at_msk")
        if event_type == "kiosk_login":
            state["status"] = "Active"
            state["active"] = True
            state["expires_at_msk"] = payload.get("expires_at_msk")
        else:
            state["status"] = "Waiting"
            state["active"] = False
            state["expires_at_msk"] = None

    return list(states.values())


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logging.basicConfig(level=settings.log_level)

    Path(settings.static_results_dir).mkdir(parents=True, exist_ok=True)
    Path("data").mkdir(parents=True, exist_ok=True)

    redis = await RedisStore.create()
    await init_dependencies(redis)
    await init_db()

    security = SecurityService(redis)
    stop_event = asyncio.Event()
    cleanup_task = asyncio.create_task(
        session_cleanup_loop(redis, security, stop_event=stop_event)
    )

    catalog = load_prompts_catalog()
    logger.info(
        "TravelTech API started (timestamps: Europe/Moscow). "
        "Prompts: %s (neurobox: %s)",
        prompts_file_path(),
        ", ".join(sorted(catalog["neurobox_styles"])),
    )
    yield

    stop_event.set()
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
    await shutdown_dependencies()


def create_app() -> FastAPI:
    settings = get_settings()
    Path(settings.static_results_dir).mkdir(parents=True, exist_ok=True)
    Path("data").mkdir(parents=True, exist_ok=True)

    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.api_prefix)
    app.mount(
        settings.static_url_prefix,
        StaticFiles(directory=settings.static_results_dir),
        name="static_results",
    )
    static_root = Path(__file__).resolve().parent.parent / "static"
    neuro_styles_dir = static_root / "neuro_styles"
    if neuro_styles_dir.is_dir():
        app.mount(
            "/static/neuro_styles",
            StaticFiles(directory=str(neuro_styles_dir)),
            name="neuro_styles",
        )
    artists_dir = static_root / "artists"
    if artists_dir.is_dir():
        app.mount(
            "/static/artists",
            StaticFiles(directory=str(artists_dir)),
            name="artists",
        )

    async def dashboard_payload() -> dict[str, Any]:
        from app.core.timezone import msk_iso, now_msk

        settings = get_settings()
        events = _read_app_events(settings.app_events_log_path)
        generations = _read_generation_dashboard(events)
        kiosks = _build_kiosk_dashboard_from_events(events)

        return {
            "status": "Live",
            "server_time_msk": msk_iso(now_msk()),
            "dashboard": {
                "generations": generations,
                "kiosks": kiosks,
            },
        }

    @app.get("/")
    async def root() -> dict[str, Any]:
        return await dashboard_payload()

    @app.get("/api/dashboard")
    async def api_dashboard() -> dict[str, Any]:
        return await dashboard_payload()

    @app.get("/health")
    async def health() -> dict[str, str]:
        from app.core.timezone import msk_iso, now_msk

        return {"status": "ok", "server_time_msk": msk_iso(now_msk())}

    return app


app = create_app()
