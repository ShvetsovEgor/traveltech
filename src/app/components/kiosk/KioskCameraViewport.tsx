import type { CSSProperties, ReactNode, RefObject } from "react";
import { useEffect, useState } from "react";
import type { KioskCameraLayout } from "../../config/kioskCamera";
import { useVideoStreamAspect } from "../../hooks/useVideoStreamAspect";

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
  const streamAspect = useVideoStreamAspect(
    videoRef,
    layout.rotationCw,
    showVideo && !cameraError
  );

  const [lockedAspect, setLockedAspect] = useState<number | null>(null);

  useEffect(() => {
    if (streamAspect) {
      setLockedAspect(streamAspect);
    }
  }, [streamAspect]);

  const frameAspect =
    streamAspect ?? lockedAspect ?? layout.photoAspectRatio;

  const frameStyle: CSSProperties = {
    aspectRatio: frameAspect,
    width: layout.frameWidth,
    maxHeight: layout.frameMaxHeight,
  };

  return (
    <div
      className={layout.frameClassName}
      style={frameStyle}
    >
      <div className="absolute inset-0 overflow-hidden">
        {showVideo ? (
          cameraError ? (
            <div className="flex size-full items-center justify-center p-8 text-center text-muted">
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
      </div>
      {children}
    </div>
  );
}
