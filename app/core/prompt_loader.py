"""Load prompt catalog from editable JSON file (always fresh read from disk)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.config import get_settings

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_DEFAULT_PROMPTS_FILE = _PROJECT_ROOT / "prompts" / "prompts.json"


def prompts_file_path() -> Path:
    configured = get_settings().prompts_file.strip()
    if configured:
        path = Path(configured)
        if not path.is_absolute():
            path = _PROJECT_ROOT / path
        return path
    return _DEFAULT_PROMPTS_FILE


def load_prompts_catalog(*, force_reload: bool = False) -> dict[str, Any]:
    """Read prompts/prompts.json. force_reload kept for API compatibility."""
    del force_reload

    path = prompts_file_path()
    if not path.is_file():
        raise FileNotFoundError(
            f"Prompt catalog not found: {path}. "
            "Create prompts/prompts.json or set PROMPTS_FILE in .env"
        )

    with path.open(encoding="utf-8") as fh:
        data = json.load(fh)

    for key in ("technical", "artist_styles", "neurobox_styles", "gender", "video_scenarios"):
        if key not in data:
            raise ValueError(f"Prompt catalog missing required section: {key!r}")

    return data
