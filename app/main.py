"""
TravelTech Kiosk API — FastAPI application entrypoint.

Run: uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.core.prompt_loader import load_prompts_catalog, prompts_file_path
from app.core.security import SecurityService
from app.database import init_db
from app.dependencies import init_dependencies, shutdown_dependencies
from app.routers import api_router
from app.services.redis_client import RedisStore
from app.services.session_cleanup import session_cleanup_loop

logger = logging.getLogger(__name__)


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

    @app.get("/")
    async def root() -> dict[str, str]:
        from app.core.timezone import msk_iso, now_msk

        return {"status": "Live", "server_time_msk": msk_iso(now_msk())}

    @app.get("/health")
    async def health() -> dict[str, str]:
        from app.core.timezone import msk_iso, now_msk

        return {"status": "ok", "server_time_msk": msk_iso(now_msk())}

    return app


app = create_app()
