import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Palette, Sparkles, Brush } from "lucide-react";
import { Button, ProgressCircle, Typography } from "@heroui/react";
import { api } from "../../api/client";
import { useKiosk } from "../../context/KioskContext";
import { useTaskPolling } from "../../hooks/useTaskPolling";
import {
  clearPendingArtistSketch,
  getPendingArtistSketchDataUrl,
  getPendingArtistSketchStyle,
} from "../../utils/artistSketchSession";
import { dataUrlToFile } from "../../utils/media";
import { KioskScreen, LoadingStepsList } from "../kiosk";

const loadingSteps = [
  { icon: Palette, text: "Подбираем палитру..." },
  { icon: Brush, text: "Обводим контуры..." },
  { icon: Sparkles, text: "Добавляем детали..." },
];

const ARTIST_GEN_LOCK_KEY = "traveltech_artist_gen_task";
const ARTIST_GEN_PENDING = "__pending__";

async function resolveSketchFile(locationState: unknown): Promise<File | null> {
  const state = (locationState ?? {}) as { sketchDataUrl?: string };
  const dataUrl = state.sketchDataUrl || getPendingArtistSketchDataUrl();
  if (!dataUrl) return null;
  return dataUrlToFile(dataUrl, "sketch.jpg");
}

export function NeuralArtistLoading() {
  const navigate = useNavigate();
  const location = useLocation();
  const { ensureInteraction, interactionToken } = useKiosk();
  const state = (location.state ?? {}) as { style?: string };
  const style =
    state.style || getPendingArtistSketchStyle() || "vangogh";

  const [sketchFile, setSketchFile] = useState<File | null | undefined>(
    undefined
  );
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const generationStartedRef = useRef(false);
  const ensureInteractionRef = useRef(ensureInteraction);
  ensureInteractionRef.current = ensureInteraction;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const file = await resolveSketchFile(location.state);
      if (!cancelled) {
        setSketchFile(file);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.state]);

  useEffect(() => {
    if (sketchFile === undefined) return;

    if (!sketchFile) {
      setStarting(false);
      setError("Набросок не найден. Нарисуйте его ещё раз.");
      return;
    }

    const existingLock = sessionStorage.getItem(ARTIST_GEN_LOCK_KEY);
    if (existingLock && existingLock !== ARTIST_GEN_PENDING) {
      setTaskId(existingLock);
      setStarting(false);
      return;
    }

    if (existingLock === ARTIST_GEN_PENDING) {
      setStarting(true);
      const pollId = window.setInterval(() => {
        const value = sessionStorage.getItem(ARTIST_GEN_LOCK_KEY);
        if (value && value !== ARTIST_GEN_PENDING) {
          setTaskId(value);
          setStarting(false);
          window.clearInterval(pollId);
        }
      }, 250);
      return () => window.clearInterval(pollId);
    }

    if (generationStartedRef.current) return;
    generationStartedRef.current = true;
    sessionStorage.setItem(ARTIST_GEN_LOCK_KEY, ARTIST_GEN_PENDING);

    let cancelled = false;

    (async () => {
      try {
        const token = await ensureInteractionRef.current("neuro_artist");
        if (cancelled) return;

        const res = await api.artistGenerate(sketchFile, style, token);
        if (!cancelled) {
          sessionStorage.setItem(ARTIST_GEN_LOCK_KEY, res.task_id);
          clearPendingArtistSketch();
          setTaskId(res.task_id);
          setStarting(false);
        }
      } catch (e) {
        generationStartedRef.current = false;
        sessionStorage.removeItem(ARTIST_GEN_LOCK_KEY);
        if (!cancelled) {
          setStarting(false);
          setError(e instanceof Error ? e.message : "Ошибка запуска генерации");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sketchFile, style]);

  useTaskPolling(taskId, interactionToken, {
    onComplete: (resultUrl) => {
      sessionStorage.removeItem(ARTIST_GEN_LOCK_KEY);
      navigate("/neural-artist/result", { state: { style, resultUrl } });
    },
    onError: (message) => {
      sessionStorage.removeItem(ARTIST_GEN_LOCK_KEY);
      generationStartedRef.current = false;
      setError(message);
    },
  });

  if (error) {
    return (
      <KioskScreen
        className="items-center justify-center"
        contentClassName="flex flex-col items-center text-center max-w-md"
      >
        <Typography.Paragraph className="text-xl mb-6">{error}</Typography.Paragraph>
        <Button
          variant="primary"
          onPress={() => {
            sessionStorage.removeItem(ARTIST_GEN_LOCK_KEY);
            generationStartedRef.current = false;
            navigate("/neural-artist/sketch", { state: { style } });
          }}
        >
          Попробовать снова
        </Button>
      </KioskScreen>
    );
  }

  return (
    <KioskScreen
      className="items-center justify-center"
      contentClassName="flex flex-col items-center text-center"
    >
      <ProgressCircle
        isIndeterminate
        size="lg"
        color="accent"
        className="mb-12"
        aria-label="Генерация"
      />

      <Typography.Heading
        level={2}
        className="mb-4 text-4xl font-bold text-foreground md:text-5xl"
      >
        {starting ? "Запускаем генерацию..." : "Создаём шедевр..."}
      </Typography.Heading>
      <Typography.Paragraph className="mb-10 text-lg text-foreground/75 md:text-xl">
        Генерация может занять до нескольких минут
      </Typography.Paragraph>

      <LoadingStepsList steps={loadingSteps} />
    </KioskScreen>
  );
}
