import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, cn } from "@heroui/react";

type SelectionCardProps = {
  title: string;
  description?: string;
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
  emoji,
  icon: Icon,
  iconClassName,
  selected,
  disabled,
  onPress,
  className,
  children,
}: SelectionCardProps) {
  return (
    <Card
      className={cn(
        "p-5 md:p-6 transition-shadow cursor-pointer h-full",
        selected && "ring-2 ring-accent shadow-lg",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
      onClick={disabled ? undefined : onPress}
    >
      {emoji && <div className="text-5xl md:text-6xl mb-3 text-center">{emoji}</div>}
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
      <Card.Title className="text-lg font-semibold text-foreground sm:text-xl md:text-2xl">
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
