import type { MouseEvent, KeyboardEvent } from "react";
import { Typography, cn } from "@heroui/react";
import { useDoubleTapAction } from "../../hooks/useDoubleTap";
import { useFullscreen } from "../../hooks/useFullscreen";

type TravelTechHeadingProps = {
  className?: string;
};

/** Двойной тап по заголовку — войти/выйти из полноэкранного режима. */
export function TravelTechHeading({ className }: TravelTechHeadingProps) {
  const { supported, toggle } = useFullscreen();
  const handleDoubleTap = useDoubleTapAction(() => {
    void toggle();
  });

  const interactiveProps = supported
    ? {
        role: "button" as const,
        tabIndex: 0,
        "aria-label": "Двойное нажатие: полноэкранный режим",
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          handleDoubleTap();
        },
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            handleDoubleTap();
          }
        },
      }
    : {};

  return (
    <Typography.Heading
      level={1}
      className={cn(
        "select-none",
        supported && "cursor-pointer pointer-events-auto",
        className
      )}
      {...interactiveProps}
    >
      TravelTech
    </Typography.Heading>
  );
}
