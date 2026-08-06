import io
import ssl
import time
from pathlib import Path

import httpx
from PIL import Image
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Загружаем переменные окружения при импорте модуля
load_dotenv()

# Инициализируем клиента один раз для переиспользования в обеих функциях
client = genai.Client()

_NETWORK_ERRORS = (
    httpx.ConnectError,
    httpx.ReadError,
    httpx.RemoteProtocolError,
    httpx.WriteError,
    httpx.TimeoutException,
    ssl.SSLError,
    ConnectionError,
    TimeoutError,
)


_MIME_BY_SUFFIX = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


def _prepare_video_image(input_image_path: str) -> tuple[bytes, str]:
    """
    Байты и MIME для Veo image-to-video.
    JPEG/PNG с диска — как есть; остальное нормализуем в JPEG через PIL.
    """
    path = Path(input_image_path)
    suffix = path.suffix.lower()
    if suffix in _MIME_BY_SUFFIX:
        with open(path, "rb") as f:
            return f.read(), _MIME_BY_SUFFIX[suffix]

    img = Image.open(path).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92)
    return buf.getvalue(), "image/jpeg"


def _success_ready_prefix(agency_label: str | None = None) -> str:
    if agency_label:
        return f"✅ Готово! {agency_label}. "
    return "✅ Готово! "


def _is_overload_error(exc: BaseException) -> bool:
    """503/429 и перегрузка — сразу переключаемся на следующую модель."""
    msg = str(exc).lower()
    return any(
        token in msg
        for token in (
            "503",
            "429",
            "unavailable",
            "high demand",
            "overloaded",
            "resource exhausted",
        )
    )


def _is_retriable_error(exc: BaseException) -> bool:
    if _is_overload_error(exc):
        return False
    if isinstance(exc, _NETWORK_ERRORS):
        return True
    msg = str(exc).lower()
    return any(
        token in msg
        for token in (
            "ssl",
            "eof",
            "connection",
            "timeout",
            "network",
            "reset",
            # Временные ошибки Gemini / Google API (кроме перегрузки — см. _is_overload_error)
            "502",
            "504",
            "500",
            "internal error",
        )
    )


def _retry_wait_seconds(attempt: int) -> int:
    """Экспоненциальная пауза: 5, 10, 15, 20, 25 с…"""
    return 5 * (attempt + 1)


def _is_location_error(exc: BaseException) -> bool:
    msg = str(exc).lower()
    return "location is not supported" in msg or (
        "failed_precondition" in msg and "location" in msg
    )


def _format_user_facing_error(message: str) -> str:
    lowered = message.lower()
    if "location is not supported" in lowered or (
        "failed_precondition" in lowered and "location" in lowered
    ):
        return (
            "Сервис генерации временно недоступен. "
            "Подождите немного и попробуйте снова."
        )
    if any(token in lowered for token in ("503", "unavailable", "overloaded", "429")):
        return "Сервис перегружен. Подождите и попробуйте снова."
    return message


def _retry_reason(exc: BaseException) -> str:
    if isinstance(exc, _NETWORK_ERRORS):
        return "Сетевой сбой"
    if _is_location_error(exc):
        return "Временная ошибка региона API"
    msg = str(exc).lower()
    if any(
        token in msg
        for token in ("503", "unavailable", "high demand", "429", "overloaded")
    ):
        return "Сервис Gemini перегружен"
    return "Временная ошибка API"


def _parse_model_chain(primary: str, fallbacks_csv: str) -> list[str]:
    chain: list[str] = []
    for name in [primary, *fallbacks_csv.split(",")]:
        n = name.strip()
        if n and n not in chain:
            chain.append(n)
    return chain


def _image_model_chain() -> list[str]:
    """Только Gemini-имена (для совместимости / явного model_name)."""
    from app.config import get_settings

    s = get_settings()
    return _parse_model_chain(s.gemini_image_model, s.gemini_image_model_fallbacks)


def _image_provider_chain() -> list[tuple[str, str]]:
    """
    Каскад бэкендов для нейростилиста / ИИ-творца:
      gemini-2.5-flash-image → flux-2-klein-4b → gemini-3.1-flash-image

    Элемент: (provider, model_or_endpoint_tag)
      provider = "gemini" | "flux"
    """
    from app.config import get_settings

    s = get_settings()
    raw = (s.image_provider_chain or "").strip()
    if raw:
        chain: list[tuple[str, str]] = []
        for part in raw.split(","):
            part = part.strip()
            if not part:
                continue
            if ":" in part:
                prov, name = part.split(":", 1)
            else:
                # "flux" или имя gemini-модели
                if part.lower() == "flux" or part.startswith("flux-"):
                    prov, name = "flux", part if part.startswith("flux-") else "flux-2-klein-4b"
                else:
                    prov, name = "gemini", part
            prov = prov.strip().lower()
            name = name.strip()
            if prov and name and (prov, name) not in chain:
                if prov == "flux" and not s.flux_token.strip():
                    print("⚠️ FLUX в IMAGE_PROVIDER_CHAIN, но FLUX_TOKEN пуст — шаг пропущен")
                    continue
                chain.append((prov, name))
        if chain:
            return chain

    # Дефолт: gemini primary → flux (если токен) → gemini fallbacks
    chain = [("gemini", s.gemini_image_model.strip() or "gemini-2.5-flash-image")]
    if s.flux_token.strip():
        chain.append(("flux", "flux-2-klein-4b"))
    for name in (s.gemini_image_model_fallbacks or "").split(","):
        n = name.strip()
        if n and ("gemini", n) not in chain:
            chain.append(("gemini", n))
    return chain


def _video_model_chain() -> list[str]:
    from app.config import get_settings

    s = get_settings()
    return _parse_model_chain(s.gemini_video_model, s.gemini_video_model_fallbacks)


def _attempts_for_model(model_idx: int, total_models: int, max_retries: int) -> int:
    """Пока есть следующий бэкенд — одна попытка и сразу дальше; на последнем — ретраи."""
    if model_idx < total_models - 1:
        return 1
    return max_retries


def _switch_to_next_step(
    step_idx: int,
    steps: list[tuple[str, str]],
    reason: str,
) -> None:
    nxt = steps[step_idx + 1]
    print(f"⚠️ {reason} — сразу пробуем {nxt[0]}:{nxt[1]} (без паузы)")


def _switch_to_next_model(
    model_idx: int,
    models: list[str],
    reason: str,
) -> None:
    """Для видео-каскада (только Gemini-имена)."""
    print(f"⚠️ {reason} — сразу пробуем {models[model_idx + 1]} (без паузы)")


def _iter_response_parts(response: object) -> list[object]:
    """Collect content parts from google-genai GenerateContentResponse."""
    collected: list[object] = []
    top_parts = getattr(response, "parts", None)
    if top_parts:
        collected.extend(top_parts)

    for candidate in getattr(response, "candidates", None) or []:
        content = getattr(candidate, "content", None)
        if not content:
            continue
        for part in getattr(content, "parts", None) or []:
            collected.append(part)
    return collected


def _extract_image_bytes_from_response(response: object) -> bytes | None:
    for part in _iter_response_parts(response):
        inline = getattr(part, "inline_data", None)
        if inline is None:
            continue
        data = getattr(inline, "data", None)
        if data:
            return data
    return None


def _describe_missing_image_response(response: object) -> str:
    text_chunks: list[str] = []
    for part in _iter_response_parts(response):
        text = getattr(part, "text", None)
        if text and str(text).strip():
            text_chunks.append(str(text).strip())

    if text_chunks:
        joined = " ".join(text_chunks)
        return f"Модель не вернула изображение: {joined[:400]}"

    prompt_feedback = getattr(response, "prompt_feedback", None)
    if prompt_feedback:
        return f"Запрос отклонён моделью: {prompt_feedback}"

    return (
        "API вернул ответ без изображения "
        "(возможна блокировка контента или временный сбой модели)"
    )


def _try_gemini_image(
    sketch_image: Image.Image,
    current_prompt: str,
    current_model: str,
    output_image_path: str,
) -> None:
    """Один вызов Gemini IMAGE. Пишет файл или бросает Exception."""
    response = client.models.generate_content(
        model=current_model,
        contents=[sketch_image, current_prompt],
        config=types.GenerateContentConfig(response_modalities=["IMAGE"]),
    )
    image_bytes = _extract_image_bytes_from_response(response)
    if not image_bytes:
        raise RuntimeError(_describe_missing_image_response(response))
    with open(output_image_path, "wb") as f:
        f.write(image_bytes)


def _try_flux_image(
    input_image_path: str,
    current_prompt: str,
    output_image_path: str,
) -> None:
    from app.config import get_settings
    from app.services.flux_client import generate_flux_edit

    s = get_settings()
    generate_flux_edit(
        input_image_path,
        current_prompt,
        output_image_path,
        token=s.flux_token,
        endpoint=s.flux_endpoint or "https://api.bfl.ai/v1/flux-2-klein-4b",
    )


def generate_stylized_image(
    input_image_path: str,
    prompt: str,
    output_image_path: str = "stylized_artwork.jpeg",
    model_name: str | None = None,
    max_retries: int = 4,
    agency_label: str | None = None,
    fallback_prompt: str | None = None,
) -> tuple[bool, str | None]:
    """
    Генерирует стилизованное изображение (ИИ-творец / Нейростилист).

    Каскад по умолчанию (один и тот же промпт):
      gemini-2.5-flash-image → FLUX klein → gemini-3.1-flash-image
    При недоступности шага — сразу следующий бэкенд без паузы.
    """
    print("🎨 Запуск генерации изображения (ИИ-творец/Нейростилист)...")

    try:
        sketch_image = Image.open(input_image_path)
    except Exception as e:
        print(f"❌ Не удалось открыть {input_image_path}: {e}")
        return False, f"Не удалось открыть фото: {e}"

    if model_name:
        steps: list[tuple[str, str]] = [("gemini", model_name)]
    else:
        steps = _image_provider_chain()

    last_error: str | None = None

    for step_idx, (provider, model_id) in enumerate(steps):
        label = f"{provider}:{model_id}"
        if len(steps) > 1:
            print(f"🤖 Бэкенд: {label} ({step_idx + 1}/{len(steps)})")

        attempts = _attempts_for_model(step_idx, len(steps), max_retries)
        try_next = False

        for attempt in range(attempts):
            # На смене бэкенда — всегда исходный промпт; упрощённый только на ретраях последнего шага
            current_prompt = (
                fallback_prompt
                if attempt > 0 and fallback_prompt
                else prompt
            )
            if attempt > 0 and fallback_prompt:
                print("🔄 Повтор с упрощённым промптом (fallback)...")
            try:
                if provider == "flux":
                    _try_flux_image(input_image_path, current_prompt, output_image_path)
                else:
                    _try_gemini_image(
                        sketch_image, current_prompt, model_id, output_image_path
                    )

                print(
                    f"{_success_ready_prefix(agency_label)}"
                    f"Картина сохранена как {output_image_path} "
                    f"(бэкенд: {label})"
                )
                return True, None

            except Exception as e:
                last_error = str(e)
                has_next = step_idx < len(steps) - 1

                # Пока есть следующий бэкенд — сразу переключаемся (тот же промпт)
                if has_next:
                    _switch_to_next_step(step_idx, steps, f"{label}: {_retry_reason(e)}")
                    try_next = True
                    break

                if _is_overload_error(e):
                    print(f"❌ Ошибка при генерации изображения: {e}")
                    return False, _format_user_facing_error(last_error)
                if (
                    _is_retriable_error(e) or _is_location_error(e)
                ) and attempt < attempts - 1:
                    wait = _retry_wait_seconds(attempt)
                    print(
                        f"⚠️ {_retry_reason(e)} (попытка {attempt + 1}/{attempts}): "
                        f"{e}. Повтор через {wait} с..."
                    )
                    time.sleep(wait)
                    continue

                print(f"❌ Ошибка при генерации изображения: {e}")
                return False, _format_user_facing_error(last_error)

        if not try_next:
            break

    return False, _format_user_facing_error(last_error or "Image generation failed")


def _save_generated_video_file(generated_video: object, output_video_path: str) -> None:
    """Сохраняет mp4 из ответа Veo (разные версии SDK)."""
    video_file = getattr(generated_video, "video", generated_video)
    client.files.download(file=video_file)

    video_bytes = getattr(video_file, "video_bytes", None)
    if video_bytes:
        Path(output_video_path).write_bytes(video_bytes)
        return

    if hasattr(video_file, "save"):
        video_file.save(output_video_path)
        if Path(output_video_path).is_file() and Path(output_video_path).stat().st_size > 0:
            return

    downloaded = client.files.download(file=video_file)
    if isinstance(downloaded, (bytes, bytearray)) and downloaded:
        Path(output_video_path).write_bytes(downloaded)
        return

    raise RuntimeError("API вернул пустое видео")


def generate_video_from_image(
    input_image_path: str, 
    prompt: str, 
    output_video_path: str = "generated_video.mp4",
    model_name: str | None = None,
    max_start_retries: int = 5,
    agency_label: str | None = None,
) -> tuple[bool, str | None]:
    """
    Оживляет фотографию на основе промпта.
    При 503/перегрузке переключается на следующую модель из GEMINI_VIDEO_MODEL_FALLBACKS.
    Включает защиту от обрывов сети.
    Возвращает True в случае успеха и False при ошибке.
    """
    print(f"🎬 Запуск генерации видео (Оживление видео)...")
    
    from app.core.image_validation import validate_portrait_image

    try:
        validate_portrait_image(Path(input_image_path))
        img_bytes, mime_type = _prepare_video_image(input_image_path)
    except ValueError as e:
        print(f"❌ {e}")
        return False, str(e)
    except FileNotFoundError:
        msg = f"Файл {input_image_path} не найден."
        print(f"❌ {msg}")
        return False, msg
    except Exception as e:
        msg = f"Не удалось прочитать {input_image_path}: {e}"
        print(f"❌ {msg}")
        return False, msg

    print(f"📸 Изображение прочитано ({mime_type}). Отправка данных на сервер...")

    models = [model_name] if model_name else _video_model_chain()
    operation = None
    last_start_error: str | None = None

    # 1. ЗАЩИТА ЭТАПА ОТПРАВКИ (с fallback моделей)
    for model_idx, current_model in enumerate(models):
        if len(models) > 1:
            print(
                f"🤖 Модель видео: {current_model} "
                f"({model_idx + 1}/{len(models)})"
            )

        attempts = _attempts_for_model(model_idx, len(models), max_start_retries)
        try_next_model = False
        for attempt in range(attempts):
            try:
                operation = client.models.generate_videos(
                    model=current_model,
                    prompt=prompt,
                    image=types.Image(
                        image_bytes=img_bytes,
                        mime_type=mime_type,
                    ),
                    config={
                        "aspect_ratio": "16:9",
                        "duration_seconds": 8,
                        "resolution": "720p",
                    }
                )
                print(
                    f"✅ Данные успешно отправлены! Запущена генерация "
                    f"(модель: {current_model})."
                )
                break

            except Exception as e:
                last_start_error = str(e)
                has_fallback = model_idx < len(models) - 1
                if has_fallback and (
                    _is_overload_error(e)
                    or (model_idx == 0 and len(models) > 1)
                ):
                    _switch_to_next_model(
                        model_idx,
                        models,
                        _retry_reason(e),
                    )
                    try_next_model = True
                    break
                if _is_overload_error(e):
                    print(f"❌ Критическая ошибка при запуске: {e}")
                    return False, f"Ошибка запуска Veo: {e}"
                if _is_retriable_error(e) and attempt < attempts - 1:
                    wait = _retry_wait_seconds(attempt)
                    print(
                        f"⚠️ {_retry_reason(e)} при загрузке "
                        f"(попытка {attempt + 1}/{attempts}): {e}. "
                        f"Повтор через {wait} с..."
                    )
                    time.sleep(wait)
                    continue
                if has_fallback:
                    _switch_to_next_model(
                        model_idx,
                        models,
                        f"Ошибка на {current_model}",
                    )
                    try_next_model = True
                    break
                print(f"❌ Критическая ошибка при запуске: {e}")
                return False, f"Ошибка запуска Veo: {e}"

        if operation:
            break
        if not try_next_model:
            break

    if not operation:
        detail = f" ({last_start_error})" if last_start_error else ""
        msg = (
            f"Не удалось отправить запрос в Veo. "
            f"Проверьте сеть и GEMINI_API_KEY{detail}."
        )
        print(f"❌ {msg}")
        return False, msg

    # 2. ЗАЩИТА ЭТАПА ОЖИДАНИЯ
    while not operation.done:
        try:
            print("⏳ Ожидание завершения генерации видео...")
            time.sleep(10)
            operation = client.operations.get(operation)
        except Exception as e:
            if _is_retriable_error(e):
                print(f"⚠️ Сетевой сбой при проверке статуса, повторяем... ({e})")
                time.sleep(10)
                continue
            print(f"❌ Ошибка при проверке статуса: {e}")
            time.sleep(10)
            continue

    # 3. ЗАЩИТА ЭТАПА СКАЧИВАНИЯ
    try:
        if not operation.response or not operation.response.generated_videos:
            return False, "Veo не вернул видео в ответе"
        generated = operation.response.generated_videos[0]
        _save_generated_video_file(generated, output_video_path)
        print(
            f"{_success_ready_prefix(agency_label)}"
            f"Видео сохранено как {output_video_path}"
        )
        return True, None
    except Exception as e:
        print(f"❌ Ошибка при скачивании или сохранении: {e}")
        return False, f"Ошибка сохранения видео: {e}"