import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { Camera, RotateCcw } from "lucide-react";
import {
  Alert,
  Button,
  Typography,
} from "@heroui/react";
import { api, resolveMediaUrl } from "../../api/client";
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
  KioskLoadingRing,
  KioskScreen,
  MediaWithQrOverlay,
} from "../kiosk";

const NEUROBOX_DRAFT_KEY = "traveltech_neurobox_draft";
const NEUROBOX_TASK_KEY = "traveltech_neurobox_task";

type NeuroboxDraft = {
  style: string;
  options: string[];
  gender?: string;
};

type SavedNeuroboxTask = {
  taskId: string | null;
  pollingToken: string | null;
  phase: "generating" | "done";
  resultUrl?: string;
};

function readDraft(): NeuroboxDraft | null {
  try {
    const raw = sessionStorage.getItem(NEUROBOX_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NeuroboxDraft;
    return parsed.style ? parsed : null;
  } catch {
    return null;
  }
}

function writeDraft(draft: NeuroboxDraft | null) {
  if (!draft) {
    sessionStorage.removeItem(NEUROBOX_DRAFT_KEY);
    return;
  }
  sessionStorage.setItem(NEUROBOX_DRAFT_KEY, JSON.stringify(draft));
}

function readSavedTask(): SavedNeuroboxTask | null {
  try {
    const raw = sessionStorage.getItem(NEUROBOX_TASK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedNeuroboxTask;
    return parsed.phase ? parsed : null;
  } catch {
    return null;
  }
}

function writeSavedTask(task: SavedNeuroboxTask | null) {
  if (!task) {
    sessionStorage.removeItem(NEUROBOX_TASK_KEY);
    return;
  }
  sessionStorage.setItem(NEUROBOX_TASK_KEY, JSON.stringify(task));
}

export function NeuralBoxPhoto() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state ?? {}) as Partial<NeuroboxDraft>;
  const { interactionToken, ensureInteraction } = useKiosk();
  const cameraLayout = useKioskCameraLayout();
  const savedTaskRef = useRef(readSavedTask());

  const draft = useMemo(() => {
    if (navState.style) {
      const next = {
        style: navState.style,
        options: navState.options ?? [],
        gender: navState.gender,
      } satisfies NeuroboxDraft;
      writeDraft(next);
      return next;
    }
    return readDraft();
  }, [navState.style, navState.options, navState.gender]);

  const style = draft?.style;
  const options = draft?.options ?? [];
  const gender = draft?.gender;

  const [countdown, setCountdown] = useState<number | null>(null);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(
    () => savedTaskRef.current?.phase === "generating"
  );
  const [showResult, setShowResult] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(
    () => savedTaskRef.current?.taskId ?? null
  );
  const [pollingToken, setPollingToken] = useState<string | null>(
    () => savedTaskRef.current?.pollingToken ?? null
  );
  const [cameraError, setCameraError] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const photoFileRef = useRef<File | null>(null);

  useEffect(() => {
    if (style || readSavedTask()) return;
    navigate("/neural-box/gender", { replace: true });
  }, [style, navigate]);

  useEffect(() => {
    if (!isGenerating || taskId) return;

    const syncFromStorage = () => {
      const saved = readSavedTask();
      if (!saved?.taskId) return;
      setTaskId(saved.taskId);
      if (saved.pollingToken) {
        setPollingToken(saved.pollingToken);
      }
      if (saved.phase === "done" && saved.resultUrl) {
        writeSavedTask(null);
      }
    };

    syncFromStorage();
    const id = window.setInterval(syncFromStorage, 500);
    return () => clearInterval(id);
  }, [isGenerating, taskId]);

  const startCamera = async () => {
    setCameraReady(false);
    setCaptureError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        setCameraReady(isVideoFrameReady(video));
      };
      setCameraError(false);
    } catch {
      setCameraError(true);
      setCameraReady(false);
    }
  };

  const stopCamera = () => {
    const video = videoRef.current;
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
  };

  useEffect(() => {
    if (showResult || isGenerating || photoTaken) {
      stopCamera();
      return;
    }
    void startCamera();
    return () => stopCamera();
  }, [showResult, isGenerating, photoTaken]);

  const startGeneration = async (file: File) => {
    if (!style) {
      setError("Стиль не выбран. Вернитесь назад и выберите стиль снова.");
      return;
    }

    const photoError = await validatePortraitFile(file);
    if (photoError) {
      setError(photoError);
      return;
    }

    let token = interactionToken ?? pollingToken;
    if (!token) {
      try {
        token = await ensureInteraction("neurobox");
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Сессия не активна. Вернитесь в меню и откройте «Нейростилист» заново."
        );
        return;
      }
    }

    setPollingToken(token);
    setIsGenerating(true);
    setError(null);
    setCaptureError(null);
    writeSavedTask({
      taskId: null,
      pollingToken: token,
      phase: "generating",
    });

    try {
      const res = await api.neuroboxGenerate(
        file,
        style,
        token,
        options,
        gender
      );
      setTaskId(res.task_id);
      writeSavedTask({
        taskId: res.task_id,
        pollingToken: token,
        phase: "generating",
      });
    } catch (e) {
      setIsGenerating(false);
      writeSavedTask(null);
      setError(e instanceof Error ? e.message : "Ошибка генерации");
    }
  };

  useTaskPolling(taskId, pollingToken ?? interactionToken, {
    onComplete: (url) => {
      setIsGenerating(false);
      setResultUrl(url);
      setShowResult(true);
      setPhotoTaken(true);
      writeSavedTask({
        taskId: taskId!,
        pollingToken,
        phase: "done",
        resultUrl: url,
      });
    },
    onError: (msg) => {
      setIsGenerating(false);
      setError(msg);
      writeSavedTask(null);
      setTaskId(null);
      setPhotoTaken(true);
    },
  });

  useEffect(() => {
    if (!taskId || showResult) return;

    let cancelled = false;
    void (async () => {
      try {
        const status = await api.getTaskStatus(taskId);
        if (cancelled) return;

        if (status.status === "completed" && status.result_url) {
          setIsGenerating(false);
          setResultUrl(status.result_url);
          setShowResult(true);
          setPhotoTaken(true);
          writeSavedTask({
            taskId,
            pollingToken,
            phase: "done",
            resultUrl: status.result_url,
          });
          return;
        }

        if (status.status === "failed" || status.status === "cancelled") {
          setIsGenerating(false);
          setError(status.error_message ?? "Генерация не удалась");
          writeSavedTask(null);
          setTaskId(null);
        }
      } catch {
        /* polling подхватит */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [taskId, pollingToken, showResult]);

  useEffect(() => {
    if (countdown === null) return;
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
        await startCamera();
        return;
      }

      const validationError = await validatePortraitFile(file);
      if (validationError) {
        setCaptureError(validationError);
        await startCamera();
        return;
      }

      setPreviewUrl(dataUrl);
      photoFileRef.current = file;
      setPhotoTaken(true);
    };
    void capture();
  }, [countdown, cameraError, cameraLayout.rotationCw]);

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
    setPhotoTaken(false);
    setShowResult(false);
    setPreviewUrl(null);
    setResultUrl(null);
    setTaskId(null);
    setPollingToken(null);
    setError(null);
    setCaptureError(null);
    setIsGenerating(false);
    photoFileRef.current = null;
    void startCamera();
  };

  const handleBack = () => {
    writeSavedTask(null);
  };

  const handleBackToMenu = () => {
    writeSavedTask(null);
    writeDraft(null);
    navigate("/");
  };

  const displayUrl = resultUrl ? resolveMediaUrl(resultUrl) : previewUrl;
  const showCaptureUi = !showResult && !isGenerating;

  if (!style && !readSavedTask()) {
    return null;
  }

  return (
    <KioskScreen backTo="/neural-box/gender" onBack={handleBack}>
      <KioskHeader
        compact
        centered={false}
        title={showResult ? "Ваш результат!" : "Сделайте фото"}
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

        {showCaptureUi ? (
          <div className="flex flex-col items-center gap-4">
            {!photoTaken && (
              <Typography.Paragraph className="text-center text-sm text-muted-foreground">
                Разместитесь в центре кадра
              </Typography.Paragraph>
            )}
            {photoTaken && (
              <Typography.Paragraph className="text-center text-sm text-muted-foreground">
                Проверьте фото и нажмите «Готово»
              </Typography.Paragraph>
            )}
            <KioskCameraViewport
              layout={cameraLayout}
              videoRef={videoRef}
              showVideo={!photoTaken}
              showImage={photoTaken}
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

            {!photoTaken ? (
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
        ) : isGenerating ? (
          <div className="flex flex-col items-center gap-6 py-10 text-center">
            <KioskLoadingRing size="lg" label="Генерация образа" />
            <Typography.Paragraph className="text-xl">
              Генерируем образ…
            </Typography.Paragraph>
            <Typography.Paragraph className="max-w-md text-sm text-muted-foreground">
              Не закрывайте экран — результат появится автоматически
            </Typography.Paragraph>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {displayUrl && (
              <MediaWithQrOverlay
                key={displayUrl}
                url={displayUrl}
                alt="Результат"
                fallbackAspectRatio={cameraLayout.photoAspectRatio}
              />
            )}
            <Typography.Paragraph className="text-center text-sm text-muted-foreground">
              Отсканируйте QR-код в углу фото
            </Typography.Paragraph>
          </div>
        )}

        {showResult && (
          <div className="flex flex-col items-center gap-3 pt-4">
            <Button variant="secondary" size="lg" onPress={handleRetake}>
              <RotateCcw className="size-5" />
              Сделать новое фото
            </Button>
            <Button variant="primary" size="lg" onPress={handleBackToMenu}>
              Вернуться в меню
            </Button>
          </div>
        )}
      </KioskBody>
    </KioskScreen>
  );
}
