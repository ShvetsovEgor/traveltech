import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { Camera, RotateCcw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Alert,
  Button,
  ProgressCircle,
  Typography,
} from "@heroui/react";
import { api, resolveMediaUrl } from "../../api/client";
import type { StickerPreviewItem } from "../../api/types";
import { useKiosk } from "../../context/KioskContext";
import { useKioskCameraLayout } from "../../hooks/useKioskCameraLayout";
import { useTaskPolling } from "../../hooks/useTaskPolling";
import {
  captureVideoFrameAsDataUrl,
  captureVideoFrameAsFile,
  isVideoFrameReady,
  validatePortraitFile,
} from "../../utils/media";
import {
  KioskBody,
  KioskCameraViewport,
  KioskHeader,
  KioskScreen,
} from "../kiosk";

const STICKER_TASK_STORAGE_KEY = "traveltech_sticker_pack_task";

const EMOTION_SLOTS = [
  { emotion_id: "joy", label: "Радость", emoji: "😀" },
  { emotion_id: "anger", label: "Гнев", emoji: "😠" },
  { emotion_id: "surprise", label: "Удивление", emoji: "😲" },
  { emotion_id: "calm", label: "Спокойствие", emoji: "😌" },
] as const;

type ScreenPhase = "capture" | "confirm" | "generating" | "done";

type SavedStickerTask = {
  taskId: string;
  pollingToken: string | null;
  phase: "generating" | "done";
};

function StickerPreviewGrid({
  previews,
  packUrl,
  animateNew = false,
}: {
  previews: StickerPreviewItem[];
  packUrl?: string | null;
  animateNew?: boolean;
}) {
  const previewById = new Map(previews.map((item) => [item.emotion_id, item]));

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-3 sm:max-w-lg">
      <div className="relative grid w-full grid-cols-2 gap-5 sm:gap-7">
        {EMOTION_SLOTS.map((slot) => {
          const preview = previewById.get(slot.emotion_id);
          const isReady = Boolean(preview);

          return (
            <div
              key={slot.emotion_id}
              className="flex flex-col items-center gap-2 rounded-2xl bg-white/60 p-2 shadow-md backdrop-blur-xl"
            >
              <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-black/5">
                {isReady && preview ? (
                  <img
                    src={resolveMediaUrl(preview.url)}
                    alt={preview.label}
                    className={`h-full w-full object-contain transition-opacity duration-500 ${
                      animateNew ? "opacity-100" : ""
                    }`}
                    draggable={false}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 px-2 text-muted-foreground">
                    <ProgressCircle isIndeterminate size="sm" color="accent" />
                    <Typography.Paragraph className="text-center text-xs">
                      Генерируем…
                    </Typography.Paragraph>
                  </div>
                )}
              </div>
              <Typography.Paragraph className="text-center text-sm font-medium">
                {slot.emoji} {slot.label}
              </Typography.Paragraph>
            </div>
          );
        })}

        {packUrl && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
            <div className="pointer-events-auto rounded-2xl bg-white/90 p-2 shadow-lg ring-1 ring-white/60 backdrop-blur-xl">
              <QRCodeSVG value={packUrl} size={132} level="H" />
            </div>
            <Typography.Paragraph className="pointer-events-auto max-w-[9rem] text-center text-xs text-muted-foreground">
              Сканируйте для Telegram
            </Typography.Paragraph>
          </div>
        )}
      </div>
    </div>
  );
}

function readSavedTask(): SavedStickerTask | null {
  try {
    const raw = sessionStorage.getItem(STICKER_TASK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedStickerTask;
    if (!parsed.taskId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSavedTask(task: SavedStickerTask | null) {
  if (!task) {
    sessionStorage.removeItem(STICKER_TASK_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(STICKER_TASK_STORAGE_KEY, JSON.stringify(task));
}

export function StickerPackPhoto() {
  const navigate = useNavigate();
  const { interactionToken, ensureInteraction, clearInteraction } = useKiosk();
  const cameraLayout = useKioskCameraLayout();
  const savedTaskRef = useRef(readSavedTask());

  const [screenPhase, setScreenPhase] = useState<ScreenPhase>(() => {
    const saved = savedTaskRef.current;
    return saved?.phase === "done" ? "done" : saved ? "generating" : "capture";
  });
  const [countdown, setCountdown] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [packUrl, setPackUrl] = useState<string | null>(null);
  const [stickerPreviews, setStickerPreviews] = useState<StickerPreviewItem[]>(
    []
  );
  const [stickerProgress, setStickerProgress] = useState(0);
  const [stickerTotal, setStickerTotal] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(
    () => savedTaskRef.current?.taskId ?? null
  );
  const [cameraError, setCameraError] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [pollingToken, setPollingToken] = useState<string | null>(
    () => savedTaskRef.current?.pollingToken ?? null
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const photoFileRef = useRef<File | null>(null);
  const cameraActiveRef = useRef(false);

  const isGeneratingPhase = screenPhase === "generating";
  const isDonePhase = screenPhase === "done";
  const showProgressGrid = isGeneratingPhase || isDonePhase;

  useEffect(() => {
    if (showProgressGrid) {
      stopCamera();
      return;
    }
    void startCamera();
    return () => stopCamera();
  }, [showProgressGrid]);

  const stopCamera = () => {
    const video = videoRef.current;
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    cameraActiveRef.current = false;
  };

  const startCamera = async () => {
    if (showProgressGrid || cameraActiveRef.current) return;

    setCameraReady(false);
    setCaptureError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (showProgressGrid) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      cameraActiveRef.current = true;
      video.onloadedmetadata = () => {
        setCameraReady(isVideoFrameReady(video));
      };
      setCameraError(false);
    } catch {
      setCameraError(true);
      setCameraReady(false);
    }
  };

  useEffect(() => {
    if (showProgressGrid) {
      stopCamera();
      return;
    }
    void startCamera();
    return () => stopCamera();
  }, [showProgressGrid]);

  const startGeneration = async (file: File) => {
    const photoError = await validatePortraitFile(file);
    if (photoError) {
      setError(photoError);
      return;
    }

    stopCamera();
    setScreenPhase("generating");
    setStickerPreviews([]);
    setStickerProgress(0);
    setStickerTotal(4);
    setError(null);
    setCaptureError(null);

    try {
      const token = await ensureInteraction("sticker_pack");
      setPollingToken(token);
      const res = await api.stickerPackGenerate(file, token);
      setTaskId(res.task_id);
      writeSavedTask({
        taskId: res.task_id,
        pollingToken: token,
        phase: "generating",
      });
    } catch (e) {
      writeSavedTask(null);
      setScreenPhase("confirm");
      setTaskId(null);
      setPollingToken(null);
      setError(e instanceof Error ? e.message : "Ошибка генерации");
      void startCamera();
    }
  };

  useEffect(() => {
    if (!taskId) return;

    let cancelled = false;
    void (async () => {
      try {
        const status = await api.getTaskStatus(taskId);
        if (cancelled) return;

        if (status.status === "processing") {
          const progress =
            status.sticker_progress ?? status.sticker_previews?.length ?? 0;
          if (status.sticker_previews?.length) {
            setStickerPreviews(status.sticker_previews);
            setStickerProgress(progress);
            setStickerTotal(status.sticker_total ?? 4);
          }
          return;
        }

        if (
          status.status === "completed" &&
          status.sticker_pack_url &&
          status.sticker_previews?.length
        ) {
          setPackUrl(status.sticker_pack_url);
          setStickerPreviews(status.sticker_previews);
          setStickerProgress(status.sticker_previews.length);
          setStickerTotal(status.sticker_previews.length);
          setScreenPhase("done");
          writeSavedTask({
            taskId,
            pollingToken,
            phase: "done",
          });
          return;
        }

        if (status.status === "failed" || status.status === "cancelled") {
          const progress =
            status.sticker_progress ?? status.sticker_previews?.length ?? 0;
          if (status.sticker_previews?.length) {
            setStickerPreviews(status.sticker_previews);
            setStickerProgress(progress);
            setStickerTotal(status.sticker_total ?? 4);
          }
          setError(status.error_message ?? "Генерация не удалась");
          writeSavedTask(null);
          setTaskId(null);
          setPollingToken(null);
        }
      } catch {
        /* polling подхватит статус */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [taskId, pollingToken]);

  useTaskPolling(
    taskId,
    pollingToken ?? interactionToken,
    {
      onComplete: () => {},
      onStickerProgress: ({ previews, progress, total }) => {
        setStickerPreviews(previews);
        setStickerProgress(progress);
        setStickerTotal(total);
      },
      onStickerPackComplete: ({ packUrl: url, previews }) => {
        setPackUrl(url);
        setStickerPreviews(previews);
        setStickerProgress(previews.length);
        setStickerTotal(previews.length);
        setScreenPhase("done");
        writeSavedTask(
          taskId
            ? {
                taskId,
                pollingToken,
                phase: "done",
              }
            : null
        );
      },
      onError: (msg) => {
        setError(msg);
        writeSavedTask(null);
        setTaskId(null);
        setPollingToken(null);
        setScreenPhase("confirm");
      },
    },
    { pollIntervalMs: 1500 }
  );

  useEffect(() => {
    if (countdown === null || showProgressGrid) return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }

    const capture = async () => {
      setCountdown(null);
      setCaptureError(null);

      const video = videoRef.current;
      if (!video || cameraError || !isVideoFrameReady(video)) {
        setCaptureError(
          "Камера не готова. Разрешите доступ к камере и дождитесь изображения."
        );
        return;
      }

      const dataUrl = captureVideoFrameAsDataUrl(video, cameraLayout.rotationCw);
      const file = await captureVideoFrameAsFile(
        video,
        "photo.jpg",
        cameraLayout.rotationCw
      );
      stopCamera();

      if (!dataUrl || !file) {
        setCaptureError("Не удалось снять кадр. Попробуйте ещё раз.");
        void startCamera();
        return;
      }

      const validationError = await validatePortraitFile(file);
      if (validationError) {
        setCaptureError(validationError);
        void startCamera();
        return;
      }

      setPreviewUrl(dataUrl);
      photoFileRef.current = file;
      setScreenPhase("confirm");
    };
    void capture();
  }, [countdown, cameraError, cameraLayout.rotationCw, showProgressGrid]);

  const handleConfirm = async () => {
    const file = photoFileRef.current;
    if (!file) return;

    const photoError = await validatePortraitFile(file);
    if (photoError) {
      setCaptureError(photoError);
      return;
    }

    await startGeneration(file);
  };

  const handleRetake = () => {
    writeSavedTask(null);
    clearInteraction();
    setScreenPhase("capture");
    setPreviewUrl(null);
    setPackUrl(null);
    setStickerPreviews([]);
    setStickerProgress(0);
    setStickerTotal(4);
    setTaskId(null);
    setPollingToken(null);
    setError(null);
    setCaptureError(null);
    photoFileRef.current = null;
    void startCamera();
  };

  const displayUrl = previewUrl;

  return (
    <KioskScreen backTo="/">
      <KioskHeader
        compact
        centered={false}
        title={
          isDonePhase
            ? "Ваш стикерпак!"
            : isGeneratingPhase
              ? error
                ? "Не удалось создать стикерпак"
                : "Создаём стикерпак…"
              : screenPhase === "confirm"
                ? "Проверьте фото"
                : "Сделайте фото"
        }
        icon={<Camera />}
      />

      <KioskBody>
        {(error || captureError) && (
          <Alert status="danger" className="mb-3 max-w-2xl">
            <Alert.Content>
              <Alert.Description>{error ?? captureError}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        {showProgressGrid ? (
          <div className="flex flex-col items-center gap-5">
            {isGeneratingPhase && (
              <Typography.Paragraph className="text-center text-sm text-muted-foreground">
                {stickerProgress === 0
                  ? "Генерируем все эмоции одним запросом…"
                  : `Готово ${stickerProgress} из ${stickerTotal}`}
                {stickerProgress > 0 &&
                  stickerProgress < stickerTotal &&
                  " — стикеры появляются по мере обработки"}
              </Typography.Paragraph>
            )}

            <StickerPreviewGrid
              previews={stickerPreviews}
              packUrl={packUrl}
              animateNew={isGeneratingPhase}
            />

            {isGeneratingPhase && stickerProgress >= stickerTotal && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <ProgressCircle isIndeterminate size="sm" color="accent" />
                <Typography.Paragraph className="text-sm">
                  Публикуем набор в Telegram…
                </Typography.Paragraph>
              </div>
            )}

            {error && (
              <Button variant="secondary" onPress={handleRetake}>
                <RotateCcw className="size-5" />
                Начать заново
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {screenPhase === "capture" && (
              <Typography.Paragraph className="text-center text-sm text-muted-foreground">
                Разместитесь в центре кадра — создадим 4 эмоции
              </Typography.Paragraph>
            )}
            {screenPhase === "confirm" && (
              <Typography.Paragraph className="text-center text-sm text-muted-foreground">
                Проверьте фото и нажмите «Готово»
              </Typography.Paragraph>
            )}
            <KioskCameraViewport
              layout={cameraLayout}
              videoRef={videoRef}
              showVideo={screenPhase === "capture"}
              showImage={screenPhase === "confirm"}
              imageSrc={displayUrl}
              cameraError={cameraError}
              cameraErrorMessage="Камера недоступна. Без фото генерация не запускается."
            >
              {countdown !== null && countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Typography.Heading level={1} className="text-9xl text-white">
                    {countdown}
                  </Typography.Heading>
                </div>
              )}
            </KioskCameraViewport>

            {screenPhase === "capture" ? (
              <Button
                variant="primary"
                size="lg"
                isDisabled={cameraError || !cameraReady || countdown !== null}
                onPress={() => setCountdown(3)}
              >
                <Camera className="size-6" />
                {cameraReady ? "Сделать фото" : "Камера загружается…"}
              </Button>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button variant="secondary" onPress={handleRetake}>
                  <RotateCcw className="size-5" />
                  Переснять
                </Button>
                <Button variant="primary" size="lg" onPress={handleConfirm}>
                  Готово
                </Button>
              </div>
            )}
          </div>
        )}

        {isDonePhase && (
          <div className="pt-4 text-center">
            <Button variant="primary" size="lg" onPress={() => navigate("/")}>
              Вернуться в меню
            </Button>
          </div>
        )}
      </KioskBody>
    </KioskScreen>
  );
}
