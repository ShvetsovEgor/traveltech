import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@heroui/react";

/** Доля ширины изображения под QR (код + белая подложка). */
const QR_RATIO = 0.2;

type MediaWithQrOverlayProps = {
  url: string;
  alt: string;
  className?: string;
  mediaClassName?: string;
  variant?: "image" | "video";
  /** Не влияет на размер; оставлен для совместимости вызовов. */
  fallbackAspectRatio?: number;
};

/** Итоговое медиа с QR; фото показывается целиком, рамка по его реальным размерам. */
export function MediaWithQrOverlay({
  url,
  alt,
  className,
  mediaClassName,
  variant = "image",
}: MediaWithQrOverlayProps) {
  const mediaRef = useRef<HTMLDivElement>(null);
  const [qrPixelSize, setQrPixelSize] = useState(0);
  const isImage = variant === "image";

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;

    const update = () => {
      const reference = isImage
        ? el.offsetWidth
        : Math.min(el.offsetWidth, el.offsetHeight);
      setQrPixelSize(Math.max(32, Math.round(reference * QR_RATIO)));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [variant, url]);

  const qrCodeSize = Math.max(24, qrPixelSize - 8);

  return (
    <div className={cn("flex w-full justify-center overflow-visible", className)}>
      <div
        ref={mediaRef}
        className={cn(
          "relative overflow-visible",
          isImage
            ? "inline-block max-w-[85vw]"
            : "mx-auto aspect-video w-[80%] max-h-[70vh] md:h-[70vh] md:w-auto md:max-w-full"
        )}
      >
        {isImage ? (
          <img
            src={url}
            alt={alt}
            className={cn(
              "block max-h-[70vh] w-auto max-w-full rounded-2xl bg-black shadow-md",
              mediaClassName
            )}
            draggable={false}
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

        {qrPixelSize > 0 && (
          <div
            className="absolute right-0 bottom-0 z-10 flex translate-x-1/4 translate-y-1/4 items-center justify-center rounded-xl bg-white p-1 shadow-xl ring-1 ring-border"
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
    </div>
  );
}
