import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { Camera, RotateCcw } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  ProgressCircle,
  Typography,
} from "@heroui/react";
import { api, resolveMediaUrl } from "../../api/client";
import { useKiosk } from "../../context/KioskContext";
import { useTaskPolling } from "../../hooks/useTaskPolling";
import { captureVideoFrameAsDataUrl, dataUrlToFile } from "../../utils/media";
import { KioskBody, KioskHeader, KioskScreen } from "../kiosk";

export function NeuralBoxPhoto() {
  const navigate = useNavigate();
  const location = useLocation();
  const { style, options = [], gender } = location.state || {};
  const { interactionToken } = useKiosk();

  const [countdown, setCountdown] = useState<number | null>(null);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const photoFileRef = useRef<File | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraError(false);
      }
    } catch {
      setCameraError(true);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
    }
  };

  const startGeneration = async (file: File) => {
    if (!interactionToken || !style) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await api.neuroboxGenerate(
        file,
        style,
        interactionToken,
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
      stopCamera();
      let file: File | null = null;
      if (videoRef.current) {
        const dataUrl = captureVideoFrameAsDataUrl(videoRef.current);
        if (dataUrl) {
          setPreviewUrl(dataUrl);
          file = await dataUrlToFile(dataUrl, "photo.jpg");
        }
      }
      if (!file) {
        file = await dataUrlToFile(
          "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=",
          "photo.jpg"
        );
        setPreviewUrl(URL.createObjectURL(file));
      }
      photoFileRef.current = file;
      setPhotoTaken(true);
    };
    capture();
  }, [countdown]);

  const handleConfirm = async () => {
    if (!photoFileRef.current) return;
    await startGeneration(photoFileRef.current);
  };

  const handleRetake = () => {
    setPhotoTaken(false);
    setShowResult(false);
    setPreviewUrl(null);
    setResultUrl(null);
    setTaskId(null);
    setError(null);
    setIsGenerating(false);
    photoFileRef.current = null;
    startCamera();
  };

  const displayUrl = resultUrl ? resolveMediaUrl(resultUrl) : previewUrl;

  return (
    <KioskScreen backTo="/neural-box/gender">
      <KioskHeader
        compact
        centered={false}
        title={showResult ? "Ваш результат!" : "Сделайте фото"}
        subtitle={
          showResult
            ? "Отсканируйте QR-код для получения фото"
            : photoTaken
              ? "Проверьте фото и нажмите «Готово»"
              : "Разместитесь в центре кадра"
        }
        icon={<Camera />}
      />

      <KioskBody>
      {error && (
        <Alert status="danger" className="mb-3 max-w-2xl">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {!showResult ? (
        <div className="flex flex-col items-center gap-4">
          <Card className="relative aspect-[4/3] w-full max-w-2xl max-h-[min(52vh,420px)] overflow-hidden p-0 bg-black">
            {!photoTaken ? (
              cameraError ? (
                <div className="w-full h-full flex items-center justify-center text-muted p-8 text-center">
                  Камера недоступна — будет использован тестовый кадр
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              displayUrl && (
                <img src={displayUrl} alt="Фото" className="w-full h-full object-cover" />
              )
            )}

            {countdown !== null && countdown > 0 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Typography.Heading level={1} className="text-9xl text-white">
                  {countdown}
                </Typography.Heading>
              </div>
            )}
          </Card>

          {!photoTaken && !isGenerating ? (
            <Button variant="primary" size="lg" onPress={() => setCountdown(3)}>
              <Camera className="size-6" />
              Сделать фото
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
        <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6 max-w-6xl mx-auto">
          {displayUrl && (
            <Card className="p-4">
              <img
                src={displayUrl}
                alt="Результат"
                className="w-full max-w-lg rounded-2xl aspect-square object-cover"
              />
            </Card>
          )}
          <Card className="p-8">
            <Card.Title className="text-2xl mb-4 text-center">Скачать фото</Card.Title>
            {displayUrl && (
              <QRCodeSVG value={displayUrl} size={256} level="H" fgColor="oklch(0.38 0.14 285)" />
            )}
          </Card>
        </div>
      )}

      {showResult && (
        <div className="pt-4 text-center">
          <Button variant="primary" size="lg" onPress={() => navigate("/menu")}>
            Вернуться в меню
          </Button>
        </div>
      )}
      </KioskBody>
    </KioskScreen>
  );
}
