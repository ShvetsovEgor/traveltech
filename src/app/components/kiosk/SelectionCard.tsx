import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, cn } from "@heroui/react";

type SelectionCardProps = {
  title: string;
  description?: string;
  coverSrc?: string;
  coverAlt?: string;
  emoji?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  className?: string;
  children?: ReactNode;
};

export function SelectionCard({
  title,
  description,
  coverSrc,
  coverAlt = "",
  emoji,
  icon: Icon,
  iconClassName,
  selected,
  disabled,
  onPress,
  className,
  children,
}: SelectionCardProps) {
  const withEmoji = Boolean(emoji);
  const withCover = Boolean(coverSrc);
  const centered = withEmoji || withCover;

  return (
    <Card
      className={cn(
        "p-5 md:p-6 transition-shadow cursor-pointer h-full",
        centered && "flex flex-col items-center text-center",
        selected && "ring-2 ring-accent shadow-lg",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
      onClick={disabled ? undefined : onPress}
    >
      {coverSrc && (
        <div className="mb-4 flex h-28 w-full items-center justify-center overflow-hidden rounded-2xl bg-default-100 md:h-36">
          <img
            src={coverSrc}
            alt={coverAlt || title}
            className="max-h-full max-w-full object-contain"
            draggable={false}
          />
        </div>
      )}
      {emoji && <div className="mb-3 text-5xl leading-none md:text-6xl">{emoji}</div>}
      {Icon && (
        <div
          className={cn(
            "mb-4 flex size-16 items-center justify-center rounded-xl bg-accent text-accent-foreground",
            iconClassName
          )}
        >
          <Icon className="size-8" />
        </div>
      )}
      <Card.Title
        className={cn(
          "text-lg font-semibold text-foreground sm:text-xl md:text-2xl",
          centered && "w-full"
        )}
      >
        {title}
      </Card.Title>
      {description && (
        <Card.Description className="mt-1 text-sm text-muted-foreground sm:text-base">
          {description}
        </Card.Description>
      )}
      {children}
    </Card>
  );
}
