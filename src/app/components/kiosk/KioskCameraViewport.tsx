import type { ReactNode, RefObject } from "react";
import { Card } from "@heroui/react";
import type { KioskCameraLayout } from "../../config/kioskCamera";

type KioskCameraViewportProps = {
  layout: KioskCameraLayout;
  videoRef: RefObject<HTMLVideoElement | null>;
  showVideo: boolean;
  showImage: boolean;
  imageSrc: string | null;
  imageAlt?: string;
  cameraError: boolean;
  cameraErrorMessage?: string;
  children?: ReactNode;
};

export function KioskCameraViewport({
  layout,
  videoRef,
  showVideo,
  showImage,
  imageSrc,
  imageAlt = "Фото",
  cameraError,
  cameraErrorMessage = "Камера недоступна.",
  children,
}: KioskCameraViewportProps) {
  return (
    <Card className={layout.frameClassName}>
      {showVideo ? (
        cameraError ? (
          <div className="flex h-full w-full items-center justify-center p-8 text-center text-muted">
            {cameraErrorMessage}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={layout.videoClassName}
          />
        )
      ) : (
        showImage &&
        imageSrc && (
          <img
            src={imageSrc}
            alt={imageAlt}
            className={layout.previewClassName}
            draggable={false}
          />
        )
      )}
      {children}
    </Card>
  );
}
