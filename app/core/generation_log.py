"""Append-only file log for successful photo/video generations (MSK timestamps)."""

from __future__ import annotations

import logging
import threading
from pathlib import Path

_lock = threading.Lock()
logger = logging.getLogger(__name__)


def append_generation_log(
    *,
    log_path: str,
    at_msk: str,
    media_type: str,
    app_type: str,
    task_id: str,
) -> None:
    """Write one tab-separated line: time, type, app, task_id."""
    line = f"{at_msk}\ttype={media_type}\tapp={app_type}\ttask_id={task_id}\n"
    path = Path(log_path)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with _lock:
            with path.open("a", encoding="utf-8") as handle:
                handle.write(line)
    except OSError:
        logger.exception("Failed to write generation log to %s", log_path)
