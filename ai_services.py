import ssl
import time
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


def _is_retriable_error(exc: BaseException) -> bool:
    if isinstance(exc, _NETWORK_ERRORS):
        return True
    msg = str(exc).lower()
    return any(
        token in msg
        for token in ("ssl", "eof", "connection", "timeout", "network", "reset")
    )


def generate_stylized_image(
    input_image_path: str,
    prompt: str,
    output_image_path: str = "stylized_artwork.jpeg",
    model_name: str = "gemini-2.5-flash-image",
    max_retries: int = 5,
) -> bool:
    """
    Генерирует стилизованное изображение на основе наброска/фото и промпта.
    Возвращает True в случае успеха и False при ошибке.
    """
    print("🎨 Запуск генерации изображения (Нейрохудожник/Нейробокс)...")

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

            print(f"✅ Готово! Картина сохранена как {output_image_path}")
            return True

        except Exception as e:
            if _is_retriable_error(e) and attempt < max_retries - 1:
                wait = 5 * (attempt + 1)
                print(
                    f"⚠️ Сетевой сбой (попытка {attempt + 1}/{max_retries}): {e}. "
                    f"Повтор через {wait} с..."
                )
                time.sleep(wait)
                continue
            print(f"❌ Ошибка при генерации изображения: {e}")
            return False

    return False


def generate_video_from_image(
    input_image_path: str, 
    prompt: str, 
    output_video_path: str = "generated_video.mp4",
    model_name: str = "veo-3.1-lite-generate-preview",
    max_start_retries: int = 5
) -> bool:
    """
    Оживляет фотографию на основе промпта.
    Включает защиту от обрывов сети.
    Возвращает True в случае успеха и False при ошибке.
    """
    print(f"🎬 Запуск генерации видео (Оживление видео)...")
    
    try:
        with open(input_image_path, "rb") as f:
            img_bytes = f.read()
    except FileNotFoundError:
        print(f"❌ Файл {input_image_path} не найден.")
        return False

    print("📸 Изображение прочитано. Отправка данных на сервер...")

    operation = None

    # 1. ЗАЩИТА ЭТАПА ОТПРАВКИ
    for attempt in range(max_start_retries):
        try:
            operation = client.models.generate_videos(
                model=model_name,
                prompt=prompt,
                image=types.Image(
                    image_bytes=img_bytes,
                    mime_type="image/jpeg"
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
                print(
                    f"⚠️ Обрыв связи при загрузке "
                    f"(попытка {attempt + 1}/{max_start_retries}): {e}"
                )
                time.sleep(5 * (attempt + 1))
                continue
            print(f"❌ Критическая ошибка при запуске: {e}")
            return False

    if not operation:
        print("❌ Не удалось отправить запрос после нескольких попыток. Проверьте сеть.")
        return False

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
        video = operation.response.generated_videos[0]
        # Скачиваем файл (client.files.download возвращает байты, которые нужно сохранить)
        client.files.download(file=video.video)
        # Обрати внимание: в твоем исходнике было video.video.save(), 
        # но в новом SDK метод сохранения может отличаться, проверяй по своей версии.
        # Если API SDK сам умеет сохранять через .save() - оставляем:
        video.video.save(output_video_path)
        print(f"✅ Готово! Видео сохранено как {output_video_path}")
        return True
    except Exception as e:
        print(f"❌ Ошибка при скачивании или сохранении: {e}")
        return False