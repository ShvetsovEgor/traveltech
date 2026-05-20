from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
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

    # Auth
    kiosk_token_ttl_hours: int = 8
    interaction_heartbeat_timeout_seconds: int = 120
    session_cleanup_interval_seconds: int = 30

    # PIN codes per kiosk (override via env: KIOSK_PIN_POPOVA=1234)
    kiosk_pin_popova: str = "1234"
    kiosk_pin_lobachevsky: str = "5678"
    kiosk_pin_robot: str = "9012"

    # Paths
    upload_base_dir: str = "/tmp/uploads"
    static_results_dir: str = "static/results"
    static_url_prefix: str = "/static/results"

    # Public base URL for result_url in responses
    public_base_url: str = "http://127.0.0.1:8000"

    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    generation_log_path: str = "data/generations.log"

    # AI prompts catalog (JSON). Keys must match UI option labels in option_map.
    prompts_file: str = "prompts/prompts.json"


@lru_cache
def get_settings() -> Settings:
    return Settings()
