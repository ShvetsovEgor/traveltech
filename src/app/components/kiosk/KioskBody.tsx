import type { ReactNode } from "react";
import { cn } from "@heroui/react";

type KioskBodyProps = {
  children: ReactNode;
  className?: string;
};

/** Прокручиваемая область под шапкой — кнопки и карточки не уезжают за экран. */
export function KioskBody({ children, className }: KioskBodyProps) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto overflow-x-hidden", className)}>
      {children}
    </div>
  );
}
