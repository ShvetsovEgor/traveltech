import type { ReactNode } from "react";
import { Typography, cn } from "@heroui/react";

type KioskHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
  centered?: boolean;
};

export function KioskHeader({
  title,
  subtitle,
  icon,
  className,
  centered = true,
}: KioskHeaderProps) {
  return (
    <header
      className={cn(
        "mb-8 pt-14",
        centered && "text-center",
        className
      )}
    >
      {icon && <div className="mb-4 flex justify-center text-accent">{icon}</div>}
      <Typography.Heading level={1} className="text-4xl md:text-5xl font-bold">
        {title}
      </Typography.Heading>
      {subtitle && (
        <Typography.Paragraph className="mt-2 text-muted text-lg md:text-xl max-w-3xl mx-auto">
          {subtitle}
        </Typography.Paragraph>
      )}
    </header>
  );
}
