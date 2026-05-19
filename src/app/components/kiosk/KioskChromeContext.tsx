import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

type KioskChromeContextValue = {
  showToolbarChrome: boolean;
  setShowToolbarChrome: (show: boolean) => void;
  toolbarCenterRef: RefObject<HTMLDivElement | null>;
  toolbarEndRef: RefObject<HTMLDivElement | null>;
};

export const KioskChromeContext = createContext<KioskChromeContextValue | null>(
  null
);

export function KioskChromeProvider({ children }: { children: ReactNode }) {
  const [showToolbarChrome, setShowToolbarChrome] = useState(false);
  const toolbarCenterRef = useRef<HTMLDivElement | null>(null);
  const toolbarEndRef = useRef<HTMLDivElement | null>(null);

  return (
    <KioskChromeContext.Provider
      value={{
        showToolbarChrome,
        setShowToolbarChrome,
        toolbarCenterRef,
        toolbarEndRef,
      }}
    >
      {children}
    </KioskChromeContext.Provider>
  );
}

export function useKioskChrome() {
  const ctx = useContext(KioskChromeContext);
  if (!ctx) {
    throw new Error("useKioskChrome must be used within KioskChromeProvider");
  }
  return ctx;
}

export function useKioskChromeOptional() {
  return useContext(KioskChromeContext);
}
