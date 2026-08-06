"""
Black Forest Labs FLUX (BFL) — дешёвый image-edit для каскада киоска.

Модель по умолчанию: flux-2-klein-4b (~$0.014/MP).
Токен: FLUX_TOKEN (x-key).
"""

from __future__ import annotations

import base64
import logging
import time
from pathlib import Path

import httpx

logger = logging.getLogger("traveltech.flux")

DEFAULT_ENDPOINT = "https://api.bfl.ai/v1/flux-2-klein-4b"
POLL_INTERVAL_S = 0.5
POLL_TIMEOUT_S = 180


class FluxError(Exception):
    """Ошибка FLUX / BFL — вызывающий код переключается на следующий бэкенд."""


def _image_to_b64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("ascii")


def generate_flux_edit(
    input_image_path: str,
    prompt: str,
    output_image_path: str,
    *,
    token: str,
    endpoint: str = DEFAULT_ENDPOINT,
) -> None:
    """
    Стилизует фото через BFL и пишет JPEG/PNG в output_image_path.
    Бросает FluxError при любой недоступности / ошибке API.
    """
    token = (token or "").strip()
    if not token:
        raise FluxError("FLUX_TOKEN не задан")

    src = Path(input_image_path)
    if not src.is_file():
        raise FluxError(f"Нет входного файла: {input_image_path}")

    headers = {
        "accept": "application/json",
        "x-key": token,
        "Content-Type": "application/json",
    }
    payload = {
        "prompt": prompt,
        "input_image": _image_to_b64(src),
        "output_format": "jpeg",
        "safety_tolerance": 2,
    }

    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(endpoint, headers=headers, json=payload)
            try:
                body = resp.json()
            except Exception:
                body = {"raw": resp.text[:500]}
            if resp.status_code >= 400:
                raise FluxError(f"BFL submit {resp.status_code}: {body}")

            polling_url = body.get("polling_url")
            if not polling_url:
                raise FluxError(f"BFL без polling_url: {body}")

            logger.info("FLUX job id=%s", body.get("id"))
            sample_url = _poll(client, headers, polling_url)

            out = client.get(sample_url, follow_redirects=True, timeout=120.0)
            out.raise_for_status()
            Path(output_image_path).write_bytes(out.content)
    except FluxError:
        raise
    except Exception as exc:
        raise FluxError(str(exc)) from exc


def _poll(client: httpx.Client, headers: dict, polling_url: str) -> str:
    t0 = time.time()
    while True:
        if time.time() - t0 > POLL_TIMEOUT_S:
            raise FluxError(f"BFL poll timeout ({POLL_TIMEOUT_S}s)")
        time.sleep(POLL_INTERVAL_S)
        resp = client.get(polling_url, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        status = data.get("status")
        if status == "Ready":
            sample = (data.get("result") or {}).get("sample")
            if not sample:
                raise FluxError(f"Ready без sample: {data}")
            return sample
        if status in ("Error", "Failed", "Request Moderated", "Content Moderated"):
            raise FluxError(f"BFL failed: {data}")
