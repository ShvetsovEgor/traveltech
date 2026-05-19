import { forwardRef } from "react";
import { GameIframe } from "./GameIframe";

type MintimerGameFrameProps = {
  className?: string;
};

/** Canvas-игра «Миссия Мин-Тимера» из mintimer_game/ */
export const MintimerGameFrame = forwardRef<
  HTMLIFrameElement,
  MintimerGameFrameProps
>(function MintimerGameFrame({ className }, ref) {
  return (
    <GameIframe
      ref={ref}
      src="/mintimer_game/index.html"
      title="Миссия Мин-Тимера"
      className={className}
    />
  );
});
