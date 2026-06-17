import { useEffect, type ReactNode } from "react";
import { cn } from "@heroui/react";
import { BackButton } from "../BackButton";
import { useKioskChrome } from "./KioskChromeContext";

type KioskScreenProps = {
  children: ReactNode;
  backTo?: string;
  onBack?: () => void;
  className?: string;
  contentClassName?: string;
};

export function KioskScreen({
  children,
  backTo,
  onBack,
  className,
  contentClassName,
}: KioskScreenProps) {
  const withBack = backTo !== undefined;
  const { setShowToolbarChrome, toolbarCenterRef, toolbarEndRef } =
    useKioskChrome();

  useEffect(() => {
    setShowToolbarChrome(withBack);
    return () => setShowToolbarChrome(false);
  }, [withBack, setShowToolbarChrome]);

  return (
    <div
      className={cn(
        "relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background text-foreground",
        className
      )}
    >
      {withBack && (
        <>
          <div className="absolute top-3 left-3 z-20 md:hidden sm:top-4 sm:left-4">
            <BackButton to={backTo} onBack={onBack} />
          </div>

          <div className="relative z-10 mx-auto hidden w-full max-w-7xl shrink-0 px-4 pb-0 pt-5 md:flex md:min-h-[3.75rem] md:items-center md:px-6 md:pt-6">
            <BackButton to={backTo} onBack={onBack} className="relative z-10 shrink-0" />
            <div
              ref={toolbarCenterRef}
              className="pointer-events-none absolute left-1/2 top-1/2 flex w-full max-w-[min(100%,36rem)] -translate-x-1/2 -translate-y-1/2 items-center justify-center px-4"
            />
            <div
              ref={toolbarEndRef}
              className="relative z-10 ml-auto hidden shrink-0 md:flex md:items-center"
            />
          </div>
        </>
      )}

      <div
        className={cn(
          "relative z-10 mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col",
          withBack
            ? "gap-3 px-3 pb-4 pt-16 sm:gap-4 sm:px-4 sm:pb-5 sm:pt-20 md:gap-4 md:px-6 md:pb-5 md:pt-4"
            : "gap-4 p-4 sm:gap-5 sm:p-6 md:p-8",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
