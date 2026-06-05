"""Создание набора стикеров в Telegram Bot API (логика из bot.py)."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import httpx

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


class StickerTelegramError(Exception):
    pass


class StickerTelegramService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        if not self.settings.telegram_bot_token:
            raise StickerTelegramError("TELEGRAM_BOT_TOKEN is not configured")
        if not self.settings.telegram_sticker_owner_id:
            raise StickerTelegramError("TELEGRAM_STICKER_OWNER_ID is not configured")
        self._api_base = (
            f"https://api.telegram.org/bot{self.settings.telegram_bot_token}"
        )
        self._bot_username: str | None = None

    @property
    def owner_id(self) -> int:
        return self.settings.telegram_sticker_owner_id

    def bot_username(self) -> str:
        if self._bot_username:
            return self._bot_username
        if self.settings.telegram_bot_username:
            self._bot_username = self.settings.telegram_bot_username.lstrip("@")
            return self._bot_username
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(f"{self._api_base}/getMe")
            data = resp.json()
        if not data.get("ok"):
            raise StickerTelegramError(data.get("description", "getMe failed"))
        username = data["result"]["username"]
        if not username:
            raise StickerTelegramError("Bot username is empty")
        self._bot_username = str(username)
        return self._bot_username

    def pack_name_for_task(self, task_id: str) -> str:
        suffix = f"_by_{self.bot_username()}"
        core = f"tt_{task_id[:16]}".lower()
        max_core = 64 - len(suffix)
        return f"{core[:max_core]}{suffix}"

    def pack_add_url(self, pack_name: str) -> str:
        return f"https://t.me/addstickers/{pack_name}"

    def upload_sticker(self, file_path: Path) -> str:
        url = f"{self._api_base}/uploadStickerFile"
        with file_path.open("rb") as handle:
            files = {
                "sticker": (file_path.name, handle, "image/webp"),
            }
            data = {
                "user_id": str(self.owner_id),
                "sticker_format": "static",
            }
            with httpx.Client(timeout=60.0) as client:
                resp = client.post(url, data=data, files=files)
        result = resp.json()
        if not result.get("ok"):
            raise StickerTelegramError(result.get("description", "uploadStickerFile failed"))
        return str(result["result"]["file_id"])

    def create_sticker_set(
        self,
        pack_name: str,
        title: str,
        stickers: list[dict[str, Any]],
    ) -> None:
        url = f"{self._api_base}/createNewStickerSet"
        payload = {
            "user_id": self.owner_id,
            "name": pack_name,
            "title": title,
            "stickers": stickers,
            "sticker_format": "static",
        }
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(url, json=payload)
        result = resp.json()
        if not result.get("ok"):
            raise StickerTelegramError(
                result.get("description", "createNewStickerSet failed")
            )

    def publish_pack(
        self,
        *,
        task_id: str,
        sticker_files: list[tuple[Path, str]],
    ) -> str:
        """
        sticker_files: (webp_path, emoji) pairs.
        Returns https://t.me/addstickers/... link.
        """
        pack_name = self.pack_name_for_task(task_id)
        logger.info("Telegram sticker set: %s (%d files)", pack_name, len(sticker_files))
        uploaded: list[dict[str, Any]] = []
        for index, (webp_path, emoji) in enumerate(sticker_files, start=1):
            logger.info("Uploading sticker %d/%d: %s", index, len(sticker_files), webp_path.name)
            file_id = self.upload_sticker(webp_path)
            uploaded.append(
                {
                    "sticker": file_id,
                    "emoji_list": [emoji],
                    "format": "static",
                }
            )
        if not uploaded:
            raise StickerTelegramError("No stickers to publish")
        logger.info("Creating Telegram sticker set %s", pack_name)
        self.create_sticker_set(
            pack_name,
            self.settings.telegram_sticker_pack_title,
            uploaded,
        )
        add_url = self.pack_add_url(pack_name)
        logger.info("Sticker pack published: %s", add_url)
        return add_url
