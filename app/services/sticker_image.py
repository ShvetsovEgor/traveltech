"""Подготовка изображений для Telegram-стикеров (512×512 WebP)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


def prepare_sticker_png(input_path: Path, output_path: Path) -> None:
    """Конвертирует изображение в PNG 512×512 с прозрачным фоном (prepare_images.py)."""
    with Image.open(input_path) as img:
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        img.thumbnail((512, 512), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        x = (512 - img.width) // 2
        y = (512 - img.height) // 2
        canvas.paste(img, (x, y))
        output_path.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(output_path, "PNG", optimize=True)


def prepare_sticker_webp(input_path: Path, output_path: Path) -> None:
    """Конвертирует изображение в WebP 512×512 для Telegram (bot.py)."""
    with Image.open(input_path) as img:
        if img.mode not in ("RGBA", "RGB"):
            img = img.convert("RGB")
        img.thumbnail((512, 512), Image.Resampling.LANCZOS)
        canvas = Image.new(
            "RGBA" if img.mode == "RGBA" else "RGB",
            (512, 512),
            (0, 0, 0, 0) if img.mode == "RGBA" else (255, 255, 255),
        )
        x = (512 - img.width) // 2
        y = (512 - img.height) // 2
        canvas.paste(img, (x, y))
        output_path.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(output_path, "WEBP", quality=85)


def split_sticker_grid(grid_path: Path, output_paths: list[Path]) -> None:
    """
    Разрезает изображение-сетку 2×2 на четыре панели.
    Порядок: top-left, top-right, bottom-left, bottom-right.
    """
    if len(output_paths) != 4:
        raise ValueError(f"Expected 4 output paths, got {len(output_paths)}")

    with Image.open(grid_path) as img:
        img = img.convert("RGB")
        width, height = img.size
        half_w, half_h = width // 2, height // 2
        boxes = [
            (0, 0, half_w, half_h),
            (half_w, 0, width, half_h),
            (0, half_h, half_w, height),
            (half_w, half_h, width, height),
        ]
        for box, out_path in zip(boxes, output_paths):
            out_path.parent.mkdir(parents=True, exist_ok=True)
            img.crop(box).save(out_path, "JPEG", quality=92)
