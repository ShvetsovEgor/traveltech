import { cn } from "@heroui/react";

type KioskLoadingRingProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
};

const SIZE_CLASS = {
  sm: "size-10 border-[3px]",
  md: "size-16 border-4",
  lg: "size-24 border-[5px]",
} as const;

/**
 * Простой CSS-спиннер для киоска.
 * Не зависит от HeroUI ProgressCircle — стабильнее в «капризных» браузерах.
 */
export function KioskLoadingRing({
  size = "lg",
  className,
  label = "Загрузка",
}: KioskLoadingRingProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        "animate-spin rounded-full border-accent border-t-transparent",
        SIZE_CLASS[size],
        className
      )}
    />
  );
}
