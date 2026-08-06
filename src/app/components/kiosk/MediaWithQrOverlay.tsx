import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Eye } from "lucide-react";
import { Typography, cn } from "@heroui/react";
import { KioskLoadingRing } from "./KioskLoadingRing";

/** Доля ширины изображения под QR (код + белая подложка). */
const QR_RATIO = 0.2;
/** Кнопка сразу — не ждём «залипший» onLoad. */
const SHOW_BUTTON_AFTER_MS = 800;
/** Если onLoad молчит — убираем спиннер сами (ссылка с API уже валидна). */
const FORCE_REVEAL_MS = 3_000;

type MediaWithQrOverlayProps = {
  url: string;
  alt: string;
  className?: string;
  mediaClassName?: string;
  variant?: "image" | "video";
  /** Пропорции контейнера до подтверждения размеров картинки. */
  fallbackAspectRatio?: number;
  /** Без спиннера/оверлея — сразу показываем картинку (например, экран рисовалки). */
  hideLoadingOverlay?: boolean;
};

function bustCache(url: string, nonce: number): string {
  if (nonce === 0) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${nonce}`;
}

/**
 * Итоговое медиа с QR (нейростилист, ИИ-творец / рисовалка, видео).
 *
 * Картинку не прячем через hidden/opacity-0.
 * Спиннер — оверлей; тап по нему / кнопка «Показать фото» сразу снимают его
 * (нативный click — HeroUI onPress на части киоск-браузеров не стреляет).
 */
export function MediaWithQrOverlay({
  url,
  alt,
  className,
  mediaClassName,
  variant = "image",
  fallbackAspectRatio = 3 / 4,
  hideLoadingOverlay = false,
}: MediaWithQrOverlayProps) {
  const mediaRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [qrPixelSize, setQrPixelSize] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [revealed, setRevealed] = useState(hideLoadingOverlay);
  const [showButton, setShowButton] = useState(false);
  const isImage = variant === "image";
  const src = bustCache(url, nonce);

  const reveal = () => {
    setRevealed(true);
    setShowButton(false);
  };

  const showPhoto = () => {
    setNonce((n) => n + 1);
    reveal();
  };

  useEffect(() => {
    setNonce(0);
    if (hideLoadingOverlay) {
      setRevealed(true);
      setShowButton(false);
      return;
    }

    setRevealed(false);
    setShowButton(false);

    const buttonTimer = window.setTimeout(
      () => setShowButton(true),
      SHOW_BUTTON_AFTER_MS
    );
    const forceTimer = window.setTimeout(reveal, FORCE_REVEAL_MS);

    return () => {
      window.clearTimeout(buttonTimer);
      window.clearTimeout(forceTimer);
    };
  }, [url, hideLoadingOverlay]);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;

    const update = () => {
      const reference = isImage
        ? Math.max(el.offsetWidth, 160)
        : Math.min(el.offsetWidth, el.offsetHeight);
      setQrPixelSize(Math.max(40, Math.round(reference * QR_RATIO)));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [variant, url, revealed, src]);

  useEffect(() => {
    if (!isImage || revealed) return;
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      reveal();
    }
  }, [isImage, revealed, src]);

  const qrCodeSize = Math.max(24, qrPixelSize - 8);
  const shellStyle = {
    aspectRatio: fallbackAspectRatio,
    width: `min(85vw, calc(70vh * ${fallbackAspectRatio}))`,
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-3 overflow-visible",
        className
      )}
    >
      <div
        ref={mediaRef}
        className={cn(
          "relative overflow-visible",
          isImage
            ? "inline-block max-w-[85vw]"
            : "mx-auto aspect-video w-[80%] max-h-[70vh] md:h-[70vh] md:w-auto md:max-w-full"
        )}
        style={isImage && !revealed ? shellStyle : undefined}
      >
        {isImage ? (
          <img
            ref={imgRef}
            key={src}
            src={src}
            alt={alt}
            className={cn(
              "block max-h-[70vh] w-auto max-w-full rounded-2xl bg-black shadow-md",
              !revealed && "h-full w-full object-contain",
              mediaClassName
            )}
            draggable={false}
            onLoad={reveal}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-black shadow-md">
            <video
              src={url}
              controls
              playsInline
              className={cn("h-full w-full max-h-[70vh]", mediaClassName)}
            />
          </div>
        )}

        {isImage && !revealed && (
          <button
            type="button"
            className="absolute inset-0 z-[5] flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl bg-black/55 active:scale-[0.99]"
            onClick={showPhoto}
            aria-label="Показать фото"
          >
            <KioskLoadingRing size="md" label="Загрузка фото" />
            <Typography.Paragraph className="px-4 text-center text-sm text-white/85">
              Загружаем фото…
            </Typography.Paragraph>
            <span className="rounded-2xl bg-white/95 px-5 py-2.5 text-base font-semibold text-foreground shadow-md">
              Показать фото
            </span>
          </button>
        )}

        {isImage && qrPixelSize > 0 && (
          <div
            className="pointer-events-none absolute right-0 bottom-0 z-10 flex translate-x-1/4 translate-y-1/4 items-center justify-center rounded-xl bg-white p-1 shadow-xl ring-1 ring-border"
            style={{ width: qrPixelSize, height: qrPixelSize }}
            aria-label="QR-код для скачивания"
          >
            <QRCodeSVG
              value={url}
              size={qrCodeSize}
              level="H"
              fgColor="oklch(0.38 0.14 285)"
            />
          </div>
        )}
      </div>

      {isImage && showButton && !revealed && (
        <button
          type="button"
          onClick={showPhoto}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-3 text-lg font-semibold text-accent-foreground shadow-md transition active:scale-95"
        >
          <Eye className="size-5" />
          Показать фото
        </button>
      )}
    </div>
  );
}
