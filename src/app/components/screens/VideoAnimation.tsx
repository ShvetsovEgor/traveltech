import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { Camera, RotateCcw, Video } from "lucide-react";
import { Alert, Button, Typography } from "@heroui/react";
import {
  captureVideoFrameAsDataUrl,
  captureVideoFrameAsFile,
  isVideoFrameReady,
  validatePortraitFile,
} from "../../utils/media";
import { saveVideoPhotoDataUrl, clearVideoPhotoDataUrl } from "../../utils/videoPhotoStore";
import { useKioskCameraLayout } from "../../hooks/useKioskCameraLayout";
import { KioskBody, KioskCameraViewport, KioskHeader, KioskScreen } from "../kiosk";

export function VideoAnimation() {
  const navigate = useNavigate();
  const cameraLayout = useKioskCameraLayout();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
          "Камера не готова. Разрешите доступ к камере и дождитесь изображения в кадре."
        );
        return;
      }

      const dataUrl = captureVideoFrameAsDataUrl(video, cameraLayout.rotationCw);
      const photoFile = await captureVideoFrameAsFile(
        video,
        "photo.jpg",
        cameraLayout.rotationCw
      );
      stopCamera();

      if (!dataUrl || !photoFile) {
        setCaptureError("Не удалось снять кадр. Попробуйте ещё раз.");
        await startCamera();
        return;
      }

      const validationError = await validatePortraitFile(photoFile);
      if (validationError) {
        setCaptureError(validationError);
        await startCamera();
        return;
      }

      setPreviewUrl(dataUrl);
      photoFileRef.current = photoFile;
      setPhotoTaken(true);
    };

    void capture();
  }, [countdown, cameraError, cameraLayout.rotationCw]);

  const handleRetake = () => {
    setPhotoTaken(false);
    setPreviewUrl(null);
    setCaptureError(null);
    photoFileRef.current = null;
    clearVideoPhotoDataUrl();
    void startCamera();
  };

  const handleConfirm = async () => {
    const file = photoFileRef.current;
    if (!file) return;

    const validationError = await validatePortraitFile(file);
    if (validationError) {
      setCaptureError(validationError);
      return;
    }

    if (previewUrl) {
      saveVideoPhotoDataUrl(previewUrl);
    }

    navigate("/video-animation/scenario", {
      state: { photoFile: file, previewUrl },
    });
  };

  return (
    <KioskScreen backTo="/">
      <KioskHeader
        compact
        centered={false}
        title="Оживление видео"
        icon={<Video />}
      />

      <KioskBody>
        <div className="flex flex-col items-center gap-4">
          <Typography.Paragraph className="text-center text-sm text-muted-foreground">
            {photoTaken
              ? "Проверьте, что на фото ваше лицо, и нажмите «Готово»"
              : "Сделайте фото — мы оживим именно его в видео"}
          </Typography.Paragraph>

          {captureError && (
            <Alert status="danger" className="max-w-2xl">
              <Alert.Content>
                <Alert.Description>{captureError}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          <KioskCameraViewport
            layout={cameraLayout}
            videoRef={videoRef}
            showVideo={!photoTaken}
            showImage={photoTaken}
            imageSrc={previewUrl}
            imageAlt="Предпросмотр"
            cameraError={cameraError}
            cameraErrorMessage="Камера недоступна. Разрешите доступ в настройках браузера и обновите страницу — без фото генерация не запускается."
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
              <Button variant="primary" size="lg" onPress={() => void handleConfirm()}>
                Готово
              </Button>
            </div>
          )}
        </div>
      </KioskBody>
    </KioskScreen>
  );
}
