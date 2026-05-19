import { forwardRef } from "react";
import { GameIframe } from "./GameIframe";

type RoverLidarGameFrameProps = {
  className?: string;
};

/** 3D-симуляция ровера и LiDAR в Иннополисе из rover_lidar/ */
export const RoverLidarGameFrame = forwardRef<
  HTMLIFrameElement,
  RoverLidarGameFrameProps
>(function RoverLidarGameFrame({ className }, ref) {
  return (
    <GameIframe
      ref={ref}
      src="/rover_lidar/index.html"
      title="Лидарная симуляция Иннополиса"
      className={className}
      background="#05050a"
    />
  );
});
