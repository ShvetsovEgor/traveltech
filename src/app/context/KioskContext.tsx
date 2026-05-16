import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";
import type { AppType, KioskId } from "../api/types";
import { getKioskIdFromSearch, parseKioskId } from "../utils/kioskLocation";

const KIOSK_TOKEN_KEY = "traveltech_kiosk_token";
const KIOSK_ID_KEY = "traveltech_kiosk_id";
const HEARTBEAT_MS = 30_000;
const STATUS_POLL_MS = 2_000;

const ENV_KIOSK_ID = parseKioskId(import.meta.env.VITE_KIOSK_ID as string | undefined);

function resolveInitialKioskId(): KioskId | null {
  if (typeof window === "undefined") return ENV_KIOSK_ID;
  const fromUrl = getKioskIdFromSearch(window.location.search);
  if (fromUrl) {
    sessionStorage.setItem(KIOSK_ID_KEY, fromUrl);
    return fromUrl;
  }
  const stored = sessionStorage.getItem(KIOSK_ID_KEY);
  if (stored) return parseKioskId(stored);
  return ENV_KIOSK_ID;
}

type KioskContextValue = {
  kioskToken: string | null;
  kioskId: KioskId | null;
  interactionToken: string | null;
  appType: AppType | null;
  isAuthenticated: boolean;
  login: (pin: string, kioskId: KioskId) => Promise<void>;
  applyRemoteAuth: (token: string, id: KioskId) => void;
  logout: () => void;
  ensureInteraction: (appType: AppType) => Promise<string>;
  clearInteraction: () => void;
};

const KioskContext = createContext<KioskContextValue | null>(null);

export function KioskProvider({ children }: { children: ReactNode }) {
  const [kioskId, setKioskId] = useState<KioskId | null>(resolveInitialKioskId);
  const [kioskToken, setKioskToken] = useState<string | null>(() => {
    const stored = sessionStorage.getItem(KIOSK_TOKEN_KEY);
    const id = resolveInitialKioskId();
    return stored && id ? stored : null;
  });
  const [interactionToken, setInteractionToken] = useState<string | null>(null);
  const [appType, setAppType] = useState<AppType | null>(null);

  const applyRemoteAuth = useCallback((token: string, id: KioskId) => {
    setKioskToken(token);
    setKioskId(id);
    sessionStorage.setItem(KIOSK_TOKEN_KEY, token);
    sessionStorage.setItem(KIOSK_ID_KEY, id);
    setInteractionToken(null);
    setAppType(null);
  }, []);

  const login = useCallback(
    async (pin: string, id: KioskId) => {
      const res = await api.login(pin, id);
      applyRemoteAuth(res.kiosk_token, res.kiosk_id);
    },
    [applyRemoteAuth]
  );

  const logout = useCallback(() => {
    setKioskToken(null);
    setInteractionToken(null);
    setAppType(null);
    sessionStorage.removeItem(KIOSK_TOKEN_KEY);
  }, []);

  const ensureInteraction = useCallback(
    async (type: AppType) => {
      if (!kioskToken) {
        throw new Error("Киоск не активирован");
      }
      if (interactionToken && appType === type) {
        await api.heartbeat(interactionToken);
        return interactionToken;
      }
      const res = await api.startInteraction(kioskToken, type);
      setInteractionToken(res.interaction_token);
      setAppType(type);
      return res.interaction_token;
    },
    [kioskToken, interactionToken, appType]
  );

  const clearInteraction = useCallback(() => {
    setInteractionToken(null);
    setAppType(null);
  }, []);

  useEffect(() => {
    const onUrlChange = () => {
      const fromUrl = getKioskIdFromSearch(window.location.search);
      if (fromUrl) setKioskId(fromUrl);
    };
    window.addEventListener("popstate", onUrlChange);
    return () => window.removeEventListener("popstate", onUrlChange);
  }, []);

  useEffect(() => {
    if (!interactionToken) return;
    const tick = () => {
      api.heartbeat(interactionToken).catch(() => undefined);
    };
    tick();
    const id = window.setInterval(tick, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [interactionToken]);

  const value = useMemo(
    () => ({
      kioskToken,
      kioskId,
      interactionToken,
      appType,
      isAuthenticated: Boolean(kioskToken),
      login,
      applyRemoteAuth,
      logout,
      ensureInteraction,
      clearInteraction,
    }),
    [
      kioskToken,
      kioskId,
      interactionToken,
      appType,
      login,
      applyRemoteAuth,
      logout,
      ensureInteraction,
      clearInteraction,
    ]
  );

  return <KioskContext.Provider value={value}>{children}</KioskContext.Provider>;
}

export function useKiosk() {
  const ctx = useContext(KioskContext);
  if (!ctx) throw new Error("useKiosk must be used within KioskProvider");
  return ctx;
}

/** Polling активации киоска (экран с QR). */
export function useKioskActivationPoll(
  kioskId: KioskId | null,
  enabled: boolean,
  onActivated: (token: string, id: KioskId) => void
) {
  useEffect(() => {
    if (!enabled || !kioskId) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const status = await api.getKioskStatus(kioskId);
        if (
          !cancelled &&
          status.active &&
          status.kiosk_token &&
          status.kiosk_id
        ) {
          onActivated(status.kiosk_token, status.kiosk_id);
        }
      } catch {
        /* backend unavailable */
      }
    };

    poll();
    const id = window.setInterval(poll, STATUS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [kioskId, enabled, onActivated]);
}
