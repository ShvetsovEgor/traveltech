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


def _is_retriable_error(exc: BaseException) -> bool:
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
            # Временные ошибки Gemini / Google API
            "503",
            "502",
            "504",
            "500",
            "429",
            "unavailable",
            "high demand",
            "rate limit",
            "resource exhausted",
            "overloaded",
            "internal error",
        )
    )


def _retry_wait_seconds(attempt: int) -> int:
    """Экспоненциальная пауза: 5, 10, 15, 20, 25 с…"""
    return 5 * (attempt + 1)


def _retry_reason(exc: BaseException) -> str:
    if isinstance(exc, _NETWORK_ERRORS):
        return "Сетевой сбой"
    msg = str(exc).lower()
    if any(
        token in msg
        for token in ("503", "unavailable", "high demand", "429", "overloaded")
    ):
        return "Сервис Gemini перегружен"
    return "Временная ошибка API"


def generate_stylized_image(
    input_image_path: str,
    prompt: str,
    output_image_path: str = "stylized_artwork.jpeg",
    model_name: str = "gemini-2.5-flash-image",
    max_retries: int = 5,
    agency_label: str | None = None,
) -> bool:
    """
    Генерирует стилизованное изображение на основе наброска/фото и промпта.
    Возвращает True в случае успеха и False при ошибке.
    """
    print("🎨 Запуск генерации изображения (ИИ-творец/Нейростилист)...")

    try:
        sketch_image = Image.open(input_image_path)
    except Exception as e:
        print(f"❌ Не удалось открыть {input_image_path}: {e}")
        return False

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=[sketch_image, prompt],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"]
                ),
            )

            with open(output_image_path, "wb") as f:
                f.write(response.parts[0].inline_data.data)

            print(
                f"{_success_ready_prefix(agency_label)}"
                f"Картина сохранена как {output_image_path}"
            )
            return True

        except Exception as e:
            if _is_retriable_error(e) and attempt < max_retries - 1:
                wait = _retry_wait_seconds(attempt)
                print(
                    f"⚠️ {_retry_reason(e)} (попытка {attempt + 1}/{max_retries}): {e}. "
                    f"Повтор через {wait} с..."
                )
                time.sleep(wait)
                continue
            print(f"❌ Ошибка при генерации изображения: {e}")
            return False

    return False


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
    model_name: str = "veo-3.1-lite-generate-preview",
    max_start_retries: int = 5,
    agency_label: str | None = None,
) -> tuple[bool, str | None]:
    """
    Оживляет фотографию на основе промпта.
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

    operation = None

    # 1. ЗАЩИТА ЭТАПА ОТПРАВКИ
    for attempt in range(max_start_retries):
        try:
            operation = client.models.generate_videos(
                model=model_name,
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
            print("✅ Данные успешно отправлены! Запущена генерация.")
            break 
            
        except Exception as e:
            if _is_retriable_error(e) and attempt < max_start_retries - 1:
                wait = _retry_wait_seconds(attempt)
                print(
                    f"⚠️ {_retry_reason(e)} при загрузке "
                    f"(попытка {attempt + 1}/{max_start_retries}): {e}. "
                    f"Повтор через {wait} с..."
                )
                time.sleep(wait)
                continue
            print(f"❌ Критическая ошибка при запуске: {e}")
            return False, f"Ошибка запуска Veo: {e}"

    if not operation:
        msg = "Не удалось отправить запрос в Veo. Проверьте сеть и GEMINI_API_KEY."
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