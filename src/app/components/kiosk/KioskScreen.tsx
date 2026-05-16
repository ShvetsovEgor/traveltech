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
  return (
    <div
      className={cn(
        "relative flex min-h-full w-full flex-col overflow-auto bg-background text-foreground",
        className
      )}
    >
      {backTo !== undefined && (
        <div className="absolute top-6 left-6 z-20">
          <BackButton to={backTo} />
        </div>
      )}
      <div className={cn("relative z-10 flex-1 p-6 md:p-10", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
