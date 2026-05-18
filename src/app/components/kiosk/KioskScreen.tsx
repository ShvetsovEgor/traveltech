import type { ReactNode } from "react";
import { cn } from "@heroui/react";
import { BackButton } from "../BackButton";

type KioskScreenProps = {
  children: ReactNode;
  backTo?: string;
  className?: string;
  contentClassName?: string;
};

export function KioskScreen({
  children,
  backTo,
  className,
  contentClassName,
}: KioskScreenProps) {
  const withBack = backTo !== undefined;

  return (
    <div
      className={cn(
        "relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background text-foreground",
        className
      )}
    >
      {withBack && (
        <div className="absolute top-3 left-3 z-20 sm:top-4 sm:left-4">
          <BackButton to={backTo} />
        </div>
      )}
      <div
        className={cn(
          "relative z-10 mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col",
          withBack
            ? "gap-3 px-3 pb-4 pt-14 sm:gap-4 sm:px-4 sm:pb-5 sm:pt-16 md:px-6"
            : "gap-4 p-4 sm:gap-5 sm:p-6 md:p-8",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
