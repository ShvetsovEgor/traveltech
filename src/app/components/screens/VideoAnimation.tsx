import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { Camera, RotateCcw, Video } from "lucide-react";
import { Button, Card, Typography } from "@heroui/react";
import {
  captureVideoFrameAsDataUrl,
  captureVideoFrameAsFile,
  dataUrlToFile,
} from "../../utils/media";
import { KioskBody, KioskHeader, KioskScreen } from "../kiosk";

export function VideoAnimation() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }

    const capture = async () => {
      setCountdown(null);
      stopCamera();
      let photoFile: File | null = null;
      if (videoRef.current) {
        const dataUrl = captureVideoFrameAsDataUrl(videoRef.current);
        if (dataUrl) {
          setPreviewUrl(dataUrl);
          photoFile = await captureVideoFrameAsFile(videoRef.current);
        }
      }
      if (!photoFile) {
        photoFile = await dataUrlToFile(
          "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=",
          "photo.jpg"
        );
        setPreviewUrl(URL.createObjectURL(photoFile));
      }
      photoFileRef.current = photoFile;
      setPhotoTaken(true);
    };
    capture();
  }, [countdown]);

  const handleRetake = () => {
    setPhotoTaken(false);
    setPreviewUrl(null);
    photoFileRef.current = null;
    startCamera();
  };

  const handleConfirm = () => {
    if (!photoFileRef.current) return;
    navigate("/video-animation/scenario", {
      state: { photoFile: photoFileRef.current, previewUrl },
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
              ? "Проверьте фото и нажмите «Готово»"
              : "Сделайте фото, и мы оживим его в видео"}
          </Typography.Paragraph>
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
            previewUrl && (
              <img
                src={previewUrl}
                alt="Предпросмотр"
                className="w-full h-full object-cover"
              />
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

        {!photoTaken ? (
          <Button variant="primary" size="lg" onPress={() => setCountdown(3)}>
            <Camera className="size-6" />
            Сделать фото
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
      </KioskBody>
    </KioskScreen>
  );
}
