import type { LucideIcon } from "lucide-react";
import { ArrowRight, Lock } from "lucide-react";
import { cn } from "@heroui/react";

const STRIP_ANGLES = [-2.8, 1.6, -1.4, 2.4] as const;
const STRIP_ANGLES_COMPACT = [-1.5, 1, -0.8, 1.2] as const;

/** Единый мягкий фон полосок на главном экране (без разноцветных градиентов). */
const STRIP_SURFACE =
  "bg-white/12 backdrop-blur-md ring-1 ring-white/25 hover:bg-white/18";

export type InteractiveStripProps = {
  title: string;
  description?: string;
  icon: LucideIcon;
  index: number;
  disabled?: boolean;
  locked?: boolean;
  onPress?: () => void;
  className?: string;
  compact?: boolean;
};

export function InteractiveStrip({
  title,
  description,
  icon: Icon,
  index,
  disabled,
  locked,
  onPress,
  className,
  compact,
}: InteractiveStripProps) {
  const angles = compact ? STRIP_ANGLES_COMPACT : STRIP_ANGLES;
  const angle = angles[index % angles.length];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onPress}
      style={{ transform: `rotate(${angle}deg)` }}
      className={cn(
        "group relative flex w-full items-center",
        compact ? "gap-3 px-3.5 py-3 sm:gap-3.5 sm:px-4 sm:py-3.5" : "gap-3 px-4 py-3.5 sm:gap-5 sm:px-6 sm:py-4 md:gap-6 md:px-8 md:py-5",
        "rounded-xl sm:rounded-2xl",
        STRIP_SURFACE,
        "text-white/90 shadow-lg",
        "transition-[transform,box-shadow,background-color] duration-200",
        "hover:shadow-xl",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50",
        "active:scale-[0.99]",
        "disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-white/12 disabled:hover:shadow-lg",
        className
      )}
    >
      {locked && (
        <Lock
          className="absolute top-3 right-3 z-10 size-4 sm:size-5 text-white/70"
          aria-hidden
        />
      )}

      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm sm:rounded-xl",
          compact ? "size-11 sm:size-12" : "size-11 sm:size-14 md:size-16"
        )}
      >
        <Icon
          className={cn(compact ? "size-5 sm:size-6" : "size-6 sm:size-7 md:size-8")}
          aria-hidden
        />
      </div>

      <div className="min-w-0 flex-1 text-left">
        <span
          className={cn(
            "block font-bold leading-tight text-inherit",
            compact ? "text-lg sm:text-xl" : "text-base sm:text-xl md:text-2xl"
          )}
        >
          {title}
        </span>
        {description && (
          <span className="mt-0.5 block text-sm font-normal leading-snug text-inherit sm:text-base">
            {description}
          </span>
        )}
      </div>

      <ArrowRight
        className={cn(
          "shrink-0 text-inherit",
          compact ? "size-6 sm:size-7" : "size-7 sm:size-8 md:size-10",
          "transition-transform duration-200",
          !disabled && "group-hover:translate-x-1.5"
        )}
        aria-hidden
      />
    </button>
  );
}
