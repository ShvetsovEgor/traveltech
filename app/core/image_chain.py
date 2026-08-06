"""
Порядок бэкендов генерации картинок (нейростилист / ИИ-творец).

Хранится в data/image_provider_chain.json — можно менять из дашборда без рестарта.
"""

from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any

_LOCK = threading.Lock()

# Три модели, которыми можно управлять из дашборда
KNOWN_STEPS: list[dict[str, str]] = [
    {
        "id": "flux",
        "provider": "flux",
        "model": "flux-2-klein-4b",
        "label": "FLUX klein 4B",
    },
    {
        "id": "gemini-2.5",
        "provider": "gemini",
        "model": "gemini-2.5-flash-image",
        "label": "Gemini 2.5 Flash Image",
    },
    {
        "id": "gemini-3.1",
        "provider": "gemini",
        "model": "gemini-3.1-flash-image",
        "label": "Gemini 3.1 Flash Image",
    },
]

_BY_ID = {s["id"]: s for s in KNOWN_STEPS}
DEFAULT_ORDER = ["flux", "gemini-2.5", "gemini-3.1"]


def _chain_file() -> Path:
    from app.config import get_settings

    root = Path(__file__).resolve().parent.parent.parent
    data_dir = root / "data"
    # если generation_log в другом месте — всё равно кладём рядом с data/
    settings = get_settings()
    log_path = Path(settings.generation_log_path)
    if not log_path.is_absolute():
        log_path = root / log_path
    data_dir = log_path.parent
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "image_provider_chain.json"


def _normalize_order(order: list[str] | None) -> list[str]:
    seen: list[str] = []
    for item in order or []:
        sid = str(item).strip()
        if sid in _BY_ID and sid not in seen:
            seen.append(sid)
    for sid in DEFAULT_ORDER:
        if sid not in seen:
            seen.append(sid)
    return seen


def load_order() -> list[str]:
    path = _chain_file()
    if not path.is_file():
        return list(DEFAULT_ORDER)
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        order = raw.get("order") if isinstance(raw, dict) else raw
        if not isinstance(order, list):
            return list(DEFAULT_ORDER)
        return _normalize_order([str(x) for x in order])
    except Exception:
        return list(DEFAULT_ORDER)


def save_order(order: list[str]) -> list[str]:
    normalized = _normalize_order(order)
    path = _chain_file()
    payload = {"order": normalized}
    with _LOCK:
        path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    return normalized


def resolve_provider_steps(*, flux_token: str = "") -> list[tuple[str, str]]:
    """Список (provider, model) для ai_services, с учётом файла и FLUX_TOKEN."""
    order = load_order()
    steps: list[tuple[str, str]] = []
    has_flux = bool((flux_token or "").strip())
    for sid in order:
        step = _BY_ID.get(sid)
        if not step:
            continue
        if step["provider"] == "flux" and not has_flux:
            continue
        steps.append((step["provider"], step["model"]))
    return steps


def dashboard_state(*, flux_token: str = "") -> dict[str, Any]:
    order = load_order()
    has_flux = bool((flux_token or "").strip())
    steps = []
    for i, sid in enumerate(order):
        meta = _BY_ID[sid]
        enabled = not (meta["provider"] == "flux" and not has_flux)
        steps.append(
            {
                "id": sid,
                "provider": meta["provider"],
                "model": meta["model"],
                "label": meta["label"],
                "position": i + 1,
                "enabled": enabled,
                "note": None if enabled else "FLUX_TOKEN не задан — шаг пропускается",
            }
        )
    return {
        "order": order,
        "steps": steps,
        "flux_token_set": has_flux,
        "effective": [
            {"provider": p, "model": m}
            for p, m in resolve_provider_steps(flux_token=flux_token)
        ],
    }
