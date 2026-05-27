"""Append-only JSONL application events log (MSK timestamps)."""

from __future__ import annotations

import json
import logging
import threading
from pathlib import Path
from typing import Any

from app.core.timezone import msk_iso, now_msk

_lock = threading.Lock()
logger = logging.getLogger(__name__)


def append_app_event(
    *,
    log_path: str,
    event_type: str,
    payload: dict[str, Any] | None = None,
) -> None:
    record = {
        "at_msk": msk_iso(now_msk()),
        "event_type": event_type,
        "payload": payload or {},
    }
    path = Path(log_path)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with _lock:
            with path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(record, ensure_ascii=False) + "\n")
    except OSError:
        logger.exception("Failed to write app event log to %s", path)
