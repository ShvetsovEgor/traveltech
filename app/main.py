"""
TravelTech Kiosk API — FastAPI application entrypoint.

Run: uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.core.prompt_loader import load_prompts_catalog, prompts_file_path
from app.core.security import SecurityService
from app.models.enums import KioskId
from app.database import init_db
from app.dependencies import get_security, init_dependencies, shutdown_dependencies
from app.routers import api_router
from app.services.redis_client import RedisStore
from app.services.session_cleanup import session_cleanup_loop

logger = logging.getLogger(__name__)


def _read_generation_dashboard(log_path: str) -> dict[str, Any]:
    """
    Parse append-only generation log (TSV) and return aggregates.
    Format: <ts>\ttype=<photo|video>\tapp=<...>\ttask_id=<...>
    """
    path = Path(log_path)
    if not path.exists():
        return {
            "total": 0,
            "photo": 0,
            "video": 0,
            "last_events": [],
        }

    photo = 0
    video = 0
    last_events: list[dict[str, str]] = []
    by_hour: dict[str, dict[str, int]] = {}
    by_day: dict[str, dict[str, int]] = {}

    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        logger.exception("Failed to read generation log from %s", path)
        return {
            "total": 0,
            "photo": 0,
            "video": 0,
            "last_events": [],
        }

    for raw in lines:
        parts = raw.split("\t")
        if len(parts) < 4:
            continue
        at_msk = parts[0]
        kv: dict[str, str] = {}
        for item in parts[1:]:
            if "=" in item:
                key, value = item.split("=", 1)
                kv[key] = value

        media_type = kv.get("type")
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

        last_events.append(
            {
                "at_msk": at_msk,
                "type": media_type or "",
                "app_type": kv.get("app", ""),
                "task_id": kv.get("task_id", ""),
            }
        )

    return {
        "total": photo + video,
        "photo": photo,
        "video": video,
        "last_events": last_events[-10:],
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

        security = get_security()
        kiosks: list[dict[str, str | bool | None]] = []
        for kiosk_id in KioskId:
            slot = await security.get_kiosk_slot_status(kiosk_id)
            kiosks.append(
                {
                    "kiosk_id": kiosk_id.value,
                    "status": "Active" if slot.get("active") else "Waiting",
                    "active": bool(slot.get("active")),
                    "expires_at_msk": slot.get("expires_at_msk"),
                }
            )

        generations = _read_generation_dashboard(get_settings().generation_log_path)

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
