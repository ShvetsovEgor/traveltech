"""Проверка портретного фото перед платной генерацией."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

MIN_PORTRAIT_BYTES = 8_000
MIN_PORTRAIT_SIDE_PX = 200


def validate_portrait_image(path: Path) -> None:
    """
    Убедиться, что загружено реальное фото, а не пустышка/битый файл.
    Raises ValueError с текстом для пользователя.
    """
    if not path.is_file():
        raise ValueError("Фото не загружено")

    size = path.stat().st_size
    if size < MIN_PORTRAIT_BYTES:
        raise ValueError(
            f"Фото не загружено или слишком маленькое ({size} байт). "
            "Сделайте снимок с камеры ещё раз."
        )

    try:
        with Image.open(path) as img:
            img.load()
            width, height = img.size
    except OSError as exc:
        raise ValueError("Не удалось прочитать фото. Сделайте снимок ещё раз.") from exc

    if width < MIN_PORTRAIT_SIDE_PX or height < MIN_PORTRAIT_SIDE_PX:
        raise ValueError(
            f"Фото слишком маленькое ({width}×{height}). "
            "Разрешите камеру и сделайте снимок заново."
        )
