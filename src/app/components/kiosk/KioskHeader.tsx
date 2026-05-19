import { useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Typography, cn } from "@heroui/react";
import { useKioskChromeOptional } from "./KioskChromeContext";

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

function InlineHeaderContent({
  title,
  subtitle,
  icon,
  onAccent,
  centered = false,
}: Pick<KioskHeaderProps, "title" | "subtitle" | "icon"> & {
  onAccent: boolean;
  centered?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5 sm:gap-3",
        centered && "justify-center"
      )}
    >
      {icon && (
        <div
          className={cn(
            "shrink-0",
            onAccent ? "text-white" : "text-accent",
            "[&_svg]:size-8 sm:[&_svg]:size-9"
          )}
        >
          {icon}
        </div>
      )}
      <div className={cn("min-w-0", centered && "text-center")}>
        <Typography.Heading
          level={1}
          className={cn(
            "truncate font-bold leading-tight text-xl sm:text-2xl",
            centered && "text-center",
            onAccent ? "text-white" : "text-foreground"
          )}
        >
          {title}
        </Typography.Heading>
        {subtitle && (
          <Typography.Paragraph
            className={cn(
              "mt-0.5 line-clamp-2 text-sm leading-snug",
              centered && "text-center",
              onAccent ? "text-white/90" : "text-muted-foreground"
            )}
          >
            {subtitle}
          </Typography.Paragraph>
        )}
      </div>
    </div>
  );
}

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
  const inline = compact && !centered;
  const chrome = useKioskChromeOptional();
  const [toolbarReady, setToolbarReady] = useState(false);

  useLayoutEffect(() => {
    if (!inline || !chrome?.showToolbarChrome) {
      setToolbarReady(false);
      return;
    }
    setToolbarReady(Boolean(chrome.toolbarCenterRef.current));
  }, [inline, chrome, title, subtitle, icon]);

  if (inline) {
    const headerContent = (
      <header className={cn("w-full min-w-0 text-center", className)}>
        <InlineHeaderContent
          title={title}
          subtitle={subtitle}
          icon={icon}
          onAccent={onAccent}
          centered
        />
      </header>
    );

    const toolbarTarget =
      toolbarReady && chrome?.toolbarCenterRef.current
        ? chrome.toolbarCenterRef.current
        : null;

    return (
      <>
        <div className={cn("shrink-0 md:hidden", compact ? "mb-2 sm:mb-3" : "mb-5 sm:mb-6")}>
          <header className={cn("pl-10 sm:pl-12", className)}>
            <InlineHeaderContent
              title={title}
              subtitle={subtitle}
              icon={icon}
              onAccent={onAccent}
            />
          </header>
        </div>

        {toolbarTarget && createPortal(headerContent, toolbarTarget)}
      </>
    );
  }

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
          "flex flex-col",
          compact ? "gap-1" : "gap-1.5 sm:gap-2",
          centered ? "items-center text-center" : "items-start text-left"
        )}
      >
        <Typography.Heading
          level={1}
          className={cn(
            "font-bold leading-tight",
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
              "max-w-3xl leading-snug",
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
