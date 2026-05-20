import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, cn } from "@heroui/react";

type SelectionCardProps = {
  title: string;
  description?: string;
  coverSrc?: string;
  coverAlt?: string;
  /** contain — целиком; cover — заполняет квадрат со скруглением */
  coverFit?: "contain" | "cover";
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
  coverFit = "contain",
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
        "px-4 pt-3.5 pb-2.5 sm:px-5 sm:pt-4 sm:pb-3 transition-shadow cursor-pointer h-full",
        withCover && "overflow-hidden rounded-3xl",
        centered && "flex flex-col items-center text-center",
        selected && "ring-2 ring-accent shadow-lg",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
      onClick={disabled ? undefined : onPress}
    >
      {coverSrc && (
        <div className="mx-auto mb-2 aspect-square w-[82%] max-w-[10.5rem] overflow-hidden rounded-xl bg-default-100 sm:max-w-[11.5rem]">
          <img
            src={coverSrc}
            alt={coverAlt || title}
            className={cn(
              "size-full rounded-xl",
              coverFit === "cover" ? "object-cover" : "object-contain"
            )}
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
          "!m-0 !py-0 text-lg font-semibold leading-none text-foreground sm:text-xl md:text-2xl",
          centered && "w-full"
        )}
      >
        {title}
      </Card.Title>
      {description && (
        <Card.Description className="!m-0 !mt-0.5 !py-0 text-sm text-muted-foreground sm:text-base">
          {description}
        </Card.Description>
      )}
      {children}
    </Card>
  );
}
