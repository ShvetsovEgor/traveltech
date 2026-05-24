import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { Camera, RotateCcw } from "lucide-react";
import {
  Alert,
  Button,
  ProgressCircle,
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
  KioskScreen,
  MediaWithQrOverlay,
} from "../kiosk";

export function NeuralBoxPhoto() {
  const navigate = useNavigate();
  const location = useLocation();
  const { style, options = [], gender } = location.state || {};
  const { interactionToken, ensureInteraction } = useKiosk();
  const cameraLayout = useKioskCameraLayout();

  const [countdown, setCountdown] = useState<number | null>(null);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const photoFileRef = useRef<File | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

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

  const startGeneration = async (file: File) => {
    if (!style) return;

    const photoError = await validatePortraitFile(file);
    if (photoError) {
      setError(photoError);
      return;
    }

    let token = interactionToken;
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

    setIsGenerating(true);
    setError(null);
    try {
      const res = await api.neuroboxGenerate(
        file,
        style,
        token,
        options,
        gender
      );
      setTaskId(res.task_id);
    } catch (e) {
      setIsGenerating(false);
      setError(e instanceof Error ? e.message : "Ошибка генерации");
    }
  };

  useTaskPolling(taskId, interactionToken, {
    onComplete: (url) => {
      setIsGenerating(false);
      setResultUrl(url);
      setShowResult(true);
    },
    onError: (msg) => {
      setIsGenerating(false);
      setError(msg);
    },
  });

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
    setPhotoTaken(false);
    setShowResult(false);
    setPreviewUrl(null);
    setResultUrl(null);
    setTaskId(null);
    setError(null);
    setCaptureError(null);
    setIsGenerating(false);
    photoFileRef.current = null;
    void startCamera();
  };

  const displayUrl = resultUrl ? resolveMediaUrl(resultUrl) : previewUrl;

  return (
    <KioskScreen backTo="/neural-box/gender">
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

      {!showResult ? (
        <div className="flex flex-col items-center gap-4">
          {!photoTaken && (
            <Typography.Paragraph className="text-center text-sm text-muted-foreground">
              Разместитесь в центре кадра
            </Typography.Paragraph>
          )}
          {photoTaken && !isGenerating && (
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

          {!photoTaken && !isGenerating ? (
            <Button
              variant="primary"
              size="lg"
              isDisabled={cameraError || !cameraReady || countdown !== null}
              onPress={() => setCountdown(3)}
            >
              <Camera className="size-6" />
              {cameraReady ? "Сделать фото" : "Камера загружается…"}
            </Button>
          ) : isGenerating ? (
            <div className="text-center">
              <ProgressCircle isIndeterminate size="lg" color="accent" className="mx-auto mb-4" />
              <Typography.Paragraph className="text-xl">Генерируем образ...</Typography.Paragraph>
            </div>
          ) : photoTaken ? (
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button variant="secondary" onPress={handleRetake}>
                <RotateCcw className="size-5" />
                Переснять
              </Button>
              <Button variant="primary" size="lg" onPress={handleConfirm}>
                Готово
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {displayUrl && (
            <MediaWithQrOverlay
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
