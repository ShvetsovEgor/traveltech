import type { ReactNode } from "react";
import { Typography, cn } from "@heroui/react";

type KioskHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
  centered?: boolean;
  /** Меньше отступов — для экранов с кнопкой «Назад» */
  compact?: boolean;
  variant?: "default" | "on-accent";
};

export function KioskHeader({
  title,
  subtitle,
  icon,
  className,
  centered = true,
  compact = false,
  variant = "default",
}: KioskHeaderProps) {
  const onAccent = variant === "on-accent";

  return (
    <header
      className={cn(
        "w-full shrink-0",
        compact ? "mb-3 sm:mb-4" : "mb-5 sm:mb-6",
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            "flex",
            compact ? "mb-2" : "mb-3 sm:mb-4",
            centered ? "justify-center" : "justify-start",
            onAccent ? "text-white" : "text-accent",
            "[&_svg]:size-10 sm:[&_svg]:size-12",
            !compact && "[&_svg]:size-12 sm:[&_svg]:size-14 md:[&_svg]:size-16"
          )}
        >
          {icon}
        </div>
      )}

      <div
        className={cn(
          "flex w-full flex-col",
          compact ? "gap-1" : "gap-1.5 sm:gap-2",
          centered ? "items-center text-center" : "items-start text-left"
        )}
      >
        <Typography.Heading
          level={1}
          className={cn(
            "w-full font-bold leading-tight",
            compact
              ? "text-2xl sm:text-3xl"
              : "text-3xl sm:text-4xl md:text-5xl",
            centered ? "text-center" : "text-left",
            onAccent ? "text-white" : "text-foreground"
          )}
        >
          {title}
        </Typography.Heading>

        {subtitle && (
          <Typography.Paragraph
            className={cn(
              "w-full max-w-3xl leading-snug",
              compact ? "text-sm sm:text-base" : "text-base sm:text-lg md:text-xl",
              centered ? "text-center" : "text-left",
              onAccent ? "text-white/90" : "text-muted-foreground"
            )}
          >
            {subtitle}
          </Typography.Paragraph>
        )}
      </div>
    </header>
  );
}
