import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { Check, Play, Clapperboard } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  Chip,
  ProgressCircle,
  Surface,
  Typography,
} from "@heroui/react";
import { api, resolveMediaUrl } from "../../api/client";
import { useKiosk } from "../../context/KioskContext";
import { useTaskPolling } from "../../hooks/useTaskPolling";
import { validatePortraitFile } from "../../utils/media";
import {
  clearVideoPhotoDataUrl,
  loadVideoPhotoFile,
} from "../../utils/videoPhotoStore";
import {
  KioskBody,
  KioskHeader,
  KioskScreen,
  MediaWithQrOverlay,
  SelectionCard,
} from "../kiosk";

const scenarios = [
  { id: "dancing", name: "Танец", emoji: "💃", options: ["Диско", "Балет", "Хип-хоп"] },
  { id: "running", name: "Марафон", emoji: "🏃", options: ["Городская улица", "Лес", "Стадион"] },
  { id: "singing", name: "Пение", emoji: "🎤", options: ["Рок-концерт", "Опера", "Караоке"] },
  { id: "space", name: "Космос", emoji: "🚀", options: ["Невесомость", "Лунная поверхность", "Станция"] },
];

type LocationState = {
  photoFile?: File;
  previewUrl?: string;
};

export function VideoAnimationScenario() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state ?? {}) as LocationState;
  const { interactionToken, ensureInteraction } = useKiosk();

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(navState.previewUrl ?? null);
  const [photoLoading, setPhotoLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resolvePhoto = async () => {
      const fromNav = navState.photoFile;
      if (fromNav && fromNav.size > 0) {
        if (!cancelled) {
          setPhotoFile(fromNav);
          setPhotoLoading(false);
        }
        return;
      }

      const fromStore = await loadVideoPhotoFile();
      if (cancelled) return;

      if (fromStore) {
        setPhotoFile(fromStore);
        setPhotoLoading(false);
        return;
      }

      navigate("/video-animation", { replace: true });
    };

    void resolvePhoto();
    return () => {
      cancelled = true;
    };
  }, [navState.photoFile, navigate]);

  useTaskPolling(taskId, interactionToken, {
    onComplete: (url) => {
      setIsGenerating(false);
      setResultUrl(url);
      setShowResult(true);
      clearVideoPhotoDataUrl();
    },
    onError: (msg) => {
      setIsGenerating(false);
      setError(msg);
    },
  });

  const handleGenerate = async () => {
    setError(null);

    if (!photoFile) {
      setError("Фото не найдено. Вернитесь назад и сделайте снимок снова.");
      return;
    }
    if (!selectedScenario || !selectedOption) {
      setError("Выберите сценарий и локацию.");
      return;
    }

    const photoError = await validatePortraitFile(photoFile);
    if (photoError) {
      setError(photoError);
      return;
    }

    let token = interactionToken;
    if (!token) {
      try {
        token = await ensureInteraction("video_magic");
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Сессия не активна. Вернитесь в меню и откройте «Оживление видео» заново."
        );
        return;
      }
    }

    setIsGenerating(true);
    try {
      const res = await api.videoGenerate(
        photoFile,
        selectedScenario,
        token,
        [selectedOption]
      );
      setTaskId(res.task_id);
    } catch (e) {
      setIsGenerating(false);
      setError(e instanceof Error ? e.message : "Ошибка запуска");
    }
  };

  const selectedScenarioData = scenarios.find((s) => s.id === selectedScenario);
  const mediaUrl = resultUrl ? resolveMediaUrl(resultUrl) : null;
  const canGenerate = Boolean(
    photoFile && selectedScenario && selectedOption && !isGenerating && !photoLoading
  );

  if (photoLoading) {
    return (
      <KioskScreen backTo="/video-animation">
        <KioskBody className="flex items-center justify-center">
          <Typography.Paragraph className="text-muted-foreground">
            Загрузка фото…
          </Typography.Paragraph>
        </KioskBody>
      </KioskScreen>
    );
  }

  return (
    <KioskScreen backTo="/video-animation">
      <KioskHeader
        compact
        centered={false}
        title={showResult ? "Ваше видео готово!" : "Выберите сценарий"}
        subtitle={showResult ? undefined : "Что будет происходить на видео?"}
        icon={<Clapperboard />}
      />

      <KioskBody>
        {error && (
          <Alert status="danger" className="mb-3 max-w-2xl">
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        {!isGenerating && !showResult && (
          <div className="mx-auto max-w-6xl">
            {previewUrl && (
              <Card className="mx-auto mb-4 aspect-[4/3] w-full max-w-xs overflow-hidden p-0 bg-black sm:max-w-sm">
                <img
                  src={previewUrl}
                  alt="Ваше фото для видео"
                  className="h-full w-full object-cover"
                />
              </Card>
            )}

            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {scenarios.map((scenario) => (
                <SelectionCard
                  key={scenario.id}
                  title={scenario.name}
                  emoji={scenario.emoji}
                  selected={selectedScenario === scenario.id}
                  onPress={() => {
                    setSelectedScenario(scenario.id);
                    setSelectedOption(null);
                  }}
                />
              ))}
            </div>

            {selectedScenarioData && (
              <Surface variant="secondary" className="mb-4 rounded-2xl p-4 sm:p-6">
                <Typography.Heading level={3} className="mb-4 text-xl sm:text-2xl">
                  Выберите локацию:
                </Typography.Heading>
                <div className="flex flex-wrap gap-4">
                  {selectedScenarioData.options.map((option) => (
                    <Chip
                      key={option}
                      className="cursor-pointer px-4 py-2"
                      color={selectedOption === option ? "accent" : "default"}
                      onClick={() => setSelectedOption(option)}
                    >
                      {selectedOption === option && (
                        <Check className="mr-1 inline size-4" />
                      )}
                      <Chip.Label>{option}</Chip.Label>
                    </Chip>
                  ))}
                </div>
              </Surface>
            )}

            <div className="text-center">
              <Button
                variant="primary"
                size="lg"
                isDisabled={!canGenerate}
                onPress={() => void handleGenerate()}
              >
                <Play className="size-6" />
                Создать видео
              </Button>
              {!selectedScenario || !selectedOption ? (
                <Typography.Paragraph className="mt-2 text-sm text-muted-foreground">
                  Сначала выберите сценарий и локацию
                </Typography.Paragraph>
              ) : null}
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="text-center">
            <ProgressCircle
              isIndeterminate
              size="lg"
              color="accent"
              className="mx-auto mb-8"
              aria-label="Создание видео"
            />
            <Typography.Heading level={2} className="mb-4 text-4xl font-bold text-foreground">
              Создаём видео...
            </Typography.Heading>
            <Typography.Paragraph className="text-lg text-foreground/75 md:text-xl">
              Это может занять несколько минут
            </Typography.Paragraph>
          </div>
        )}

        {showResult && mediaUrl && (
          <div className="flex flex-col items-center gap-3">
            <MediaWithQrOverlay
              url={mediaUrl}
              alt="Сгенерированное видео"
              variant="video"
            />
            <Typography.Paragraph className="text-center text-sm text-muted-foreground">
              Отсканируйте QR-код в углу видео
            </Typography.Paragraph>
          </div>
        )}

        {showResult && (
          <div className="pt-4 text-center">
            <Button variant="primary" size="lg" onPress={() => navigate("/")}>
              Вернуться в меню
            </Button>
          </div>
        )}
      </KioskBody>
    </KioskScreen>
  );
}
