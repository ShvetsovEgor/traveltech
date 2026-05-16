"""File storage: temp uploads and static results."""

from __future__ import annotations

import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.config import get_settings


def upload_dir(interaction_token: str) -> Path:
    settings = get_settings()
    path = Path(settings.upload_base_dir) / interaction_token
    path.mkdir(parents=True, exist_ok=True)
    return path


def results_dir() -> Path:
    settings = get_settings()
    path = Path(settings.static_results_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


async def save_upload(
    interaction_token: str,
    file: UploadFile,
    *,
    suffix: str = "",
) -> Path:
    ext = Path(file.filename or "upload.bin").suffix or ".bin"
    dest = upload_dir(interaction_token) / f"{uuid4().hex}{suffix}{ext}"
    content = await file.read()
    dest.write_bytes(content)
    return dest


def result_path(task_id: str, extension: str) -> Path:
    ext = extension if extension.startswith(".") else f".{extension}"
    return results_dir() / f"{task_id}{ext}"


def result_url(task_id: str, extension: str) -> str:
    settings = get_settings()
    ext = extension if extension.startswith(".") else f".{extension}"
    filename = f"{task_id}{ext}"
    return f"{settings.public_base_url.rstrip('/')}{settings.static_url_prefix}/{filename}"


def cleanup_upload_dir(interaction_token: str) -> None:
    path = Path(get_settings().upload_base_dir) / interaction_token
    if path.exists():
        shutil.rmtree(path, ignore_errors=True)


def cleanup_upload_file(path: Path) -> None:
    if path.exists():
        path.unlink(missing_ok=True)
