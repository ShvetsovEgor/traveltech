import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RotateCcw } from "lucide-react";
import { Button, Spinner, Typography, cn } from "@heroui/react";

/** Доля ширины изображения под QR (код + белая подложка). */
const QR_RATIO = 0.2;
/** Авто-повторы загрузки фото (сервер мог быть занят сразу после генерации). */
const MAX_AUTO_RETRIES = 3;
const RETRY_DELAY_MS = 2_500;
/**
 * Если `<img>` не отдаёт ни onLoad, ни onError (зависшее соединение,
 * "тухлый" TCP-стрим, CDN не успел отдать файл) — не ждём браузерный
 * таймаут (может быть 1-2 минуты), а сами считаем попытку неудачной.
 */
const LOAD_STALL_TIMEOUT_MS = 2_000;

type MediaWithQrOverlayProps = {
  url: string;
  alt: string;
  className?: string;
  mediaClassName?: string;
  variant?: "image" | "video";
  /** Пропорции заглушки, пока фото грузится (ширина / высота). */
  fallbackAspectRatio?: number;
};

type LoadStatus = "loading" | "loaded" | "error";

function withCacheBuster(url: string, attempt: number): string {
  if (attempt === 0) return url;
  return `${url}${url.includes("?") ? "&" : "?"}retry=${attempt}`;
}

/** Итоговое медиа с QR; фото показывается целиком, рамка по его реальным размерам. */
export function MediaWithQrOverlay({
  url,
  alt,
  className,
  mediaClassName,
  variant = "image",
  fallbackAspectRatio = 3 / 4,
}: MediaWithQrOverlayProps) {
  const mediaRef = useRef<HTMLDivElement>(null);
  const [qrPixelSize, setQrPixelSize] = useState(0);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const failCountRef = useRef(0);
  const retryTimerRef = useRef(0);
  const stallTimerRef = useRef(0);
  const isImage = variant === "image";

  useEffect(() => {
    setStatus("loading");
    setAttempt(0);
    failCountRef.current = 0;
    return () => {
      window.clearTimeout(retryTimerRef.current);
      window.clearTimeout(stallTimerRef.current);
    };
  }, [url]);

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

  const handleImageError = () => {
    window.clearTimeout(stallTimerRef.current);
    failCountRef.current += 1;
    if (failCountRef.current <= MAX_AUTO_RETRIES) {
      retryTimerRef.current = window.setTimeout(() => {
        setAttempt((a) => a + 1);
      }, RETRY_DELAY_MS);
      return;
    }
    setStatus("error");
  };

  const handleImageLoad = () => {
    window.clearTimeout(stallTimerRef.current);
    setStatus("loaded");
  };

  const handleManualRetry = () => {
    window.clearTimeout(stallTimerRef.current);
    failCountRef.current = 0;
    setStatus("loading");
    setAttempt((a) => a + 1);
  };

  // Запасной таймер на каждую попытку: если `<img>` не даёт ни onLoad,
  // ни onError за LOAD_STALL_TIMEOUT_MS (зависшее соединение), считаем
  // попытку неудачной и запускаем обычную логику ретрая/ошибки.
  useEffect(() => {
    if (!isImage || status !== "loading") return;
    stallTimerRef.current = window.setTimeout(() => {
      handleImageError();
    }, LOAD_STALL_TIMEOUT_MS);
    return () => window.clearTimeout(stallTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isImage, status, attempt]);

  const qrCodeSize = Math.max(24, qrPixelSize - 8);
  const showQr = qrPixelSize > 0 && (!isImage || status === "loaded");
  const placeholderStyle = {
    aspectRatio: fallbackAspectRatio,
    width: `min(85vw, calc(70vh * ${fallbackAspectRatio}))`,
  };

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
          <>
            {status !== "error" && (
              <img
                key={attempt}
                src={withCacheBuster(url, attempt)}
                alt={alt}
                className={cn(
                  "block max-h-[70vh] w-auto max-w-full rounded-2xl bg-black shadow-md",
                  status !== "loaded" && "hidden",
                  mediaClassName
                )}
                draggable={false}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}

            {status === "loading" && (
              <div
                className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/85 shadow-md"
                style={placeholderStyle}
              >
                <Spinner size="lg" color="accent" />
                <Typography.Paragraph className="px-4 text-center text-sm text-white/70">
                  Загружаем фото…
                </Typography.Paragraph>
              </div>
            )}

            {status === "error" && (
              <div
                className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-black/85 p-6 shadow-md"
                style={placeholderStyle}
              >
                <Typography.Paragraph className="text-center text-sm text-white/80">
                  Не удалось загрузить фото. Проверьте сеть и попробуйте ещё раз.
                </Typography.Paragraph>
                <Button variant="secondary" onPress={handleManualRetry}>
                  <RotateCcw className="size-5" />
                  Обновить
                </Button>
              </div>
            )}
          </>
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

        {showQr && (
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
