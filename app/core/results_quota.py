"""Удаление старых картинок, когда каталог результатов доходит до 70% квоты."""

from __future__ import annotations

import logging
import threading
from pathlib import Path

from app.config import get_settings

logger = logging.getLogger(__name__)

_IMAGE_SUFFIXES = {".jpeg", ".jpg", ".png", ".webp", ".gif"}
_LOCK = threading.Lock()


def enforce_results_image_quota(*, protect: set[Path] | None = None) -> int:
    """
    Если static/results занял >= 70% квоты (по умолчанию 512 МБ),
    удаляет самые старые картинки, пока занято меньше порога.
    Видео учитываются в объёме, но не удаляются.
    """
    settings = get_settings()
    quota_mb = settings.results_storage_quota_mb
    ratio = settings.results_storage_cleanup_ratio
    if quota_mb <= 0 or ratio <= 0:
        return 0
    root = Path(settings.static_results_dir)
    return enforce_image_quota(
        root,
        quota_bytes=quota_mb * 1024 * 1024,
        ratio=ratio,
        protect=protect,
    )


def enforce_image_quota(
    root: Path,
    *,
    quota_bytes: int,
    ratio: float = 0.7,
    protect: set[Path] | None = None,
) -> int:
    if quota_bytes <= 0 or ratio <= 0 or not root.is_dir():
        return 0

    threshold = int(quota_bytes * ratio)
    protected_files = {p.resolve() for p in (protect or set()) if p.is_file()}
    protected_dirs = [p.resolve() for p in (protect or set()) if p.is_dir()]

    with _LOCK:
        files = [p for p in root.rglob("*") if p.is_file()]
        total = sum(p.stat().st_size for p in files)
        if total < threshold:
            return 0

        images = sorted(
            (p for p in files if p.suffix.lower() in _IMAGE_SUFFIXES),
            key=lambda p: p.stat().st_mtime,
        )
        deleted = 0
        for path in images:
            if total < threshold:
                break
            resolved = path.resolve()
            if resolved in protected_files or any(
                resolved.is_relative_to(directory) for directory in protected_dirs
            ):
                continue
            try:
                size = path.stat().st_size
                path.unlink(missing_ok=True)
            except OSError:
                logger.exception("Не удалось удалить %s", path)
                continue
            total -= size
            deleted += 1
            logger.info(
                "Квота результатов: удалена картинка %s (%s байт), осталось %s / %s",
                path.name,
                size,
                total,
                threshold,
            )

        _remove_empty_dirs(root)

        if total >= threshold:
            logger.warning(
                "Каталог результатов всё ещё %.0f%% квоты после удаления %s картинок "
                "(видео и защищённые файлы не трогаем)",
                100 * total / quota_bytes,
                deleted,
            )
        elif deleted:
            logger.info(
                "Квота результатов: удалено %s картинок, занято %s из %s байт (порог %s)",
                deleted,
                total,
                quota_bytes,
                threshold,
            )
        return deleted


def _remove_empty_dirs(root: Path) -> None:
    dirs = sorted(
        (p for p in root.rglob("*") if p.is_dir()),
        key=lambda p: len(p.parts),
        reverse=True,
    )
    for directory in dirs:
        try:
            directory.rmdir()
        except OSError:
            continue
