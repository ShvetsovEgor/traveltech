import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, setKioskUnauthorizedHandler } from "../api/client";
import type { AppType, GuideAgencyId, KioskId } from "../api/types";
import { getKioskIdFromSearch, parseKioskId } from "../utils/kioskLocation";

const KIOSK_TOKEN_KEY = "traveltech_kiosk_token";
const KIOSK_ID_KEY = "traveltech_kiosk_id";
const HEARTBEAT_MS = 30_000;
const STATUS_POLL_MS = 2_000;

const ENV_KIOSK_ID = parseKioskId(import.meta.env.VITE_KIOSK_ID as string | undefined);

function isGuideAuthPath(): boolean {
  return (
    typeof window !== "undefined" &&
    window.location.pathname.includes("/guide/auth")
  );
}

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
  authBootstrapped: boolean;
  login: (pin: string, kioskId: KioskId, agencyId?: GuideAgencyId) => Promise<void>;
  applyRemoteAuth: (token: string, id: KioskId) => void;
  logout: () => Promise<void>;
  ensureInteraction: (appType: AppType) => Promise<string>;
  clearInteraction: () => void;
};

const KioskContext = createContext<KioskContextValue | null>(null);

export function KioskProvider({ children }: { children: ReactNode }) {
  const [kioskId, setKioskId] = useState<KioskId | null>(resolveInitialKioskId);
  const [kioskToken, setKioskToken] = useState<string | null>(null);
  const [authBootstrapped, setAuthBootstrapped] = useState(false);
  const [interactionToken, setInteractionToken] = useState<string | null>(null);
  const [appType, setAppType] = useState<AppType | null>(null);
  const bootstrapGenRef = useRef(0);

  const clearKioskAuth = useCallback(() => {
    setKioskToken(null);
    setInteractionToken(null);
    setAppType(null);
    sessionStorage.removeItem(KIOSK_TOKEN_KEY);
    sessionStorage.removeItem("traveltech_guide_auth_success");
  }, []);

  const applyRemoteAuth = useCallback((token: string, id: KioskId) => {
    setKioskToken(token);
    setKioskId(id);
    sessionStorage.setItem(KIOSK_TOKEN_KEY, token);
    sessionStorage.setItem(KIOSK_ID_KEY, id);
    setInteractionToken(null);
    setAppType(null);
  }, []);

  const login = useCallback(
    async (pin: string, id: KioskId, agencyId: GuideAgencyId = "traveltech") => {
      const res = await api.login(pin, id, agencyId);
      applyRemoteAuth(res.kiosk_token, res.kiosk_id);
    },
    [applyRemoteAuth]
  );

  const logout = useCallback(async () => {
    const token = kioskToken;
    if (token) {
      try {
        await api.logout(token);
      } catch {
        /* clear local state even if backend is unreachable */
      }
    }
    clearKioskAuth();
  }, [kioskToken, clearKioskAuth]);

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
    setKioskUnauthorizedHandler(clearKioskAuth);
    return () => setKioskUnauthorizedHandler(null);
  }, [clearKioskAuth]);

  useEffect(() => {
    const onUrlChange = () => {
      const fromUrl = getKioskIdFromSearch(window.location.search);
      if (fromUrl) setKioskId(fromUrl);
    };
    window.addEventListener("popstate", onUrlChange);
    return () => window.removeEventListener("popstate", onUrlChange);
  }, []);

  useEffect(() => {
    if (!kioskId) {
      setAuthBootstrapped(true);
      return;
    }

    const generation = ++bootstrapGenRef.current;
    let cancelled = false;

    const bootstrapAuth = async () => {
      try {
        const status = await api.getKioskStatus(kioskId);
        if (cancelled || generation !== bootstrapGenRef.current) return;

        if (status.active && status.kiosk_token) {
          applyRemoteAuth(status.kiosk_token, status.kiosk_id);
        } else if (!isGuideAuthPath()) {
          clearKioskAuth();
        }
      } catch {
        if (cancelled || generation !== bootstrapGenRef.current) return;
        if (isGuideAuthPath()) return;

        const stored = sessionStorage.getItem(KIOSK_TOKEN_KEY);
        if (stored) {
          setKioskToken(stored);
        }
      } finally {
        if (!cancelled && generation === bootstrapGenRef.current) {
          setAuthBootstrapped(true);
        }
      }
    };

    void bootstrapAuth();

    return () => {
      cancelled = true;
    };
  }, [kioskId, applyRemoteAuth, clearKioskAuth]);

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
      authBootstrapped,
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
      authBootstrapped,
      login,
      applyRemoteAuth,
      logout,
      ensureInteraction,
      clearInteraction,
    ]
  );

  return (
    <KioskContext.Provider value={value}>
      <KioskActivationWatcher />
      {children}
    </KioskContext.Provider>
  );
}

/** Ожидание входа гида: poll слота киоска, пока не авторизованы. */
function KioskActivationWatcher() {
  const { kioskId, kioskToken, authBootstrapped, applyRemoteAuth } = useKiosk();

  useKioskActivationPoll(
    kioskId,
    authBootstrapped && !kioskToken,
    applyRemoteAuth
  );

  return null;
}

export function useKiosk() {
  const ctx = useContext(KioskContext);
  if (!ctx) throw new Error("useKiosk must be used within KioskProvider");
  return ctx;
}

/** Polling активации киоска (слот на бэкенде после PIN гида). */
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
