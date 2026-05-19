import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router";
import { LogOut } from "lucide-react";
import { Button, Spinner, cn } from "@heroui/react";
import { useKiosk } from "../context/KioskContext";
import { useKioskChromeOptional } from "./kiosk/KioskChromeContext";

export function EndSessionButton() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, logout } = useKiosk();
  const chrome = useKioskChromeOptional();
  const [loading, setLoading] = useState(false);
  const [toolbarSlotReady, setToolbarSlotReady] = useState(false);

  const showInToolbar = Boolean(chrome?.showToolbarChrome);

  useLayoutEffect(() => {
    if (!showInToolbar) {
      setToolbarSlotReady(false);
      return;
    }
    setToolbarSlotReady(Boolean(chrome?.toolbarEndRef.current));
  }, [showInToolbar, chrome?.toolbarEndRef]);

  if (!isAuthenticated) return null;

  const handleEndSession = async () => {
    setLoading(true);
    try {
      await logout();
      const query = searchParams.toString();
      navigate(query ? `/?${query}` : "/");
    } finally {
      setLoading(false);
    }
  };

  const button = (variant: "fixed" | "toolbar") => (
    <Button
      variant="secondary"
      size={variant === "toolbar" ? "lg" : "sm"}
      className={cn(
        "gap-2 border border-border bg-card text-foreground shadow-sm",
        variant === "fixed" &&
          "fixed top-4 right-4 z-30 backdrop-blur-sm sm:top-5 sm:right-5 sm:text-base",
        variant === "fixed" && showInToolbar && "md:hidden",
        variant === "toolbar" && "shrink-0"
      )}
      isDisabled={loading}
      onPress={handleEndSession}
    >
      {loading ? (
        <Spinner size="sm" color="current" />
      ) : (
        <LogOut className="size-4 sm:size-5" aria-hidden />
      )}
      Завершить сессию
    </Button>
  );

  const toolbarTarget =
    showInToolbar && toolbarSlotReady && chrome?.toolbarEndRef.current
      ? chrome.toolbarEndRef.current
      : null;

  return (
    <>
      {button("fixed")}
      {toolbarTarget && createPortal(button("toolbar"), toolbarTarget)}
    </>
  );
}
