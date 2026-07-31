from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_ENV_FILE = _PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # На Render .env нет — только переменные из Dashboard (они имеют приоритет).
        env_file=str(_ENV_FILE) if _ENV_FILE.is_file() else None,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "TravelTech Kiosk API"
    debug: bool = False
    api_prefix: str = "/api"

    # CORS
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://missioninnopolis.ru",
            "https://www.missioninnopolis.ru",
        ]
    )

    # Database (SQLite by default; set DATABASE_URL for PostgreSQL)
    database_url: str = "sqlite+aiosqlite:///./data/traveltech.db"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth (kiosk session ends only on explicit logout or frontend idle timeout)
    interaction_heartbeat_timeout_seconds: int = 600
    session_cleanup_interval_seconds: int = 30

    # PIN codes per kiosk — Технологии путешествий (override: KIOSK_PIN_POPOVA=1234)
    kiosk_pin_popova: str = "1234"
    kiosk_pin_lobachevsky: str = "5678"
    kiosk_pin_robot: str = "9012"
    kiosk_pin_rameeva: str = "3456"

    # Уматур
    kiosk_pin_umatour_popova: str = "7101"
    kiosk_pin_umatour_lobachevsky: str = "7102"
    kiosk_pin_umatour_robot: str = "7103"
    kiosk_pin_umatour_rameeva: str = "7104"

    # Иннотрэвел
    kiosk_pin_innotravel_popova: str = "8101"
    kiosk_pin_innotravel_lobachevsky: str = "8102"
    kiosk_pin_innotravel_robot: str = "8103"
    kiosk_pin_innotravel_rameeva: str = "8104"

    # Paths
    upload_base_dir: str = "/tmp/uploads"
    static_results_dir: str = "static/results"
    static_url_prefix: str = "/static/results"

    # Public base URL for result_url in responses
    public_base_url: str = "http://127.0.0.1:8000"

    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    generation_log_path: str = "data/generations.log"
    app_events_log_path: str = "data/app_events.jsonl"

    # AI prompts catalog (JSON). Keys must match UI option labels in option_map.
    prompts_file: str = "prompts/prompts.json"

    # Google GenAI models (ai_services.py). Fallbacks — через запятую, без пробелов обязательно.
    gemini_image_model: str = "gemini-2.5-flash-image"
    gemini_image_model_fallbacks: str = "gemini-3.1-flash-image"
    gemini_video_model: str = "veo-3.1-lite-generate-preview"
    gemini_video_model_fallbacks: str = "veo-3.1-generate-preview"

    # Telegram sticker pack (sticker_pack flow)
    telegram_bot_token: str = ""
    telegram_sticker_owner_id: int = 0
    telegram_bot_username: str = ""
    telegram_sticker_pack_title: str = "TravelTech — эмоции"

    @property
    def telegram_sticker_configured(self) -> bool:
        return bool(self.telegram_bot_token and self.telegram_sticker_owner_id)


@lru_cache
def get_settings() -> Settings:
    return Settings()
