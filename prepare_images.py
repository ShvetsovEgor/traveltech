"""CLI: подготовка PNG 512×512 для стикеров (обёртка над app.services.sticker_image)."""

from pathlib import Path

from app.services.sticker_image import prepare_sticker_png


def main() -> None:
    input_folder = Path("photo")
    output_folder = Path("photo_processed")
    output_folder.mkdir(exist_ok=True)

    supported_formats = (".png", ".jpg", ".jpeg", ".webp")

    for img_file in input_folder.iterdir():
        if img_file.suffix.lower() not in supported_formats:
            continue
        output_file = output_folder / f"{img_file.stem}_sticker.png"
        try:
            prepare_sticker_png(img_file, output_file)
            print(f"✅ Обработано: {img_file.name} -> {output_file.name}")
        except Exception as exc:
            print(f"❌ Ошибка при обработке {img_file.name}: {exc}")


if __name__ == "__main__":
    main()
