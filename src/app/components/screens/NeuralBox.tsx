import { useState } from "react";
import { useNavigate } from "react-router";
import { Box, Check } from "lucide-react";
import { Button, Chip } from "@heroui/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { KioskBody, KioskHeader, KioskScreen, SelectionCard } from "../kiosk";

type OptionGroup = {
  id: string;
  label: string;
  options: string[];
};

type NeuroStyle = {
  id: string;
  name: string;
  emoji?: string;
  coverSrc?: string;
  options?: string[];
  optionGroups?: OptionGroup[];
};

const styles: NeuroStyle[] = [
  {
    id: "cyberpunk",
    name: "Киберпанк",
    coverSrc: "/static/neuro_styles/cyberpunk.png",
    options: ["Неон", "Темный фон"],
  },
  {
    id: "zombie",
    name: "Зомби",
    coverSrc: "/static/neuro_styles/zombie.png",
    options: ["Страшный", "Веселый"],
  },
  {
    id: "superhero",
    name: "Супергерой",
    coverSrc: "/static/neuro_styles/superhero.png",
    optionGroups: [
      {
        id: "hero",
        label: "Герой",
        options: [
          "Супермен",
          "Человек-паук",
        ],
      },
      {
        id: "style",
        label: "Стиль",
        options: ["Реалистик", "Семи-реалистик", "Комикс", "Кинематографичный"],
      },
      {
        id: "pose",
        label: "Поза",
        options: [
          "Классическая героическая",
          "Полет",
          "Приземление",
          "Динамичный рывок",
          "Расслабленный герой",
        ],
      },
    ],
  },
  {
    id: "barbie",
    name: "Барби",
    coverSrc: "/static/neuro_styles/barbie.png",
    optionGroups: [
      {
        id: "style",
        label: "Стиль",
        options: ["Реалистик", "Семи-реалистик", "Кукольный", "Кинематографичный"],
      },
      {
        id: "pose",
        label: "Поза",
        options: [
          "Классическая Барби",
          "В машине",
          "На пляже",
          "Dreamhouse поза",
          "Фотосессия / мода",
        ],
      },
    ],
  },
  {
    id: "simpsons",
    name: "Симпсоны",
    coverSrc: "/static/neuro_styles/simpsons.png",
  },
  {
    id: "tatar",
    name: "Татарский стиль",
    coverSrc: "/static/neuro_styles/tatar.png",
    optionGroups: [
      {
        id: "face",
        label: "Лицо",
        options: [
          "Полная фотореалистика",
          "Полностью мультяшное лицо, но черты сохранены",
        ],
      },
    ],
  },
];

function hasHeroSelected(style: NeuroStyle, selected: string[]): boolean {
  const heroGroup = style.optionGroups?.find((g) => g.id === "hero");
  if (!heroGroup) return true;
  return selected.some((o) => heroGroup.options.includes(o));
}

function orderOptionsForStyle(style: NeuroStyle, selected: string[]): string[] {
  if (style.optionGroups) {
    return style.optionGroups.flatMap((group) =>
      selected.filter((o) => group.options.includes(o))
    );
  }
  return selected;
}

export function NeuralBox() {
  const navigate = useNavigate();
  const [activeStyleId, setActiveStyleId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const activeStyle = styles.find((s) => s.id === activeStyleId);

  const openStylePicker = (styleId: string) => {
    const style = styles.find((s) => s.id === styleId);
    if (!style) return;

    const hasOptions =
      (style.options?.length ?? 0) > 0 || (style.optionGroups?.length ?? 0) > 0;
    if (!hasOptions) {
      navigate("/neural-box/gender", {
        state: { style: styleId, options: [] },
      });
      return;
    }

    setActiveStyleId(styleId);
    setSelectedOptions([]);
    setPickerOpen(true);
  };

  const closeStylePicker = () => {
    setPickerOpen(false);
    setActiveStyleId(null);
    setSelectedOptions([]);
  };

  const toggleFlatOption = (option: string) => {
    setSelectedOptions((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  const toggleGroupedOption = (group: OptionGroup, option: string) => {
    setSelectedOptions((prev) => {
      const withoutGroup = prev.filter((o) => !group.options.includes(o));
      if (prev.includes(option)) {
        return withoutGroup;
      }
      return [...withoutGroup, option];
    });
  };

  const canContinue =
    !activeStyle?.optionGroups?.some((g) => g.id === "hero") ||
    (activeStyle ? hasHeroSelected(activeStyle, selectedOptions) : false);

  const handleContinue = () => {
    if (!activeStyleId || !activeStyle || !canContinue) return;
    navigate("/neural-box/gender", {
      state: {
        style: activeStyleId,
        options: orderOptionsForStyle(activeStyle, selectedOptions),
      },
    });
  };

  return (
    <KioskScreen backTo="/">
      <KioskHeader
        compact
        centered={false}
        title="Нейростилист"
        subtitle="Преобразите своё лицо в разных стилях"
        icon={<Box />}
        className="max-md:mb-2"
      />

      <KioskBody>
        <div className="mx-auto w-full max-w-6xl max-md:w-[95%]">
          <div className="mx-auto grid w-full grid-cols-2 gap-1.5 md:max-w-6xl md:grid-cols-3 md:gap-4">
            {styles.map((style) => (
              <SelectionCard
                key={style.id}
                variant="compact"
                title={style.name}
                coverSrc={style.coverSrc}
                coverAlt={style.name}
                selected={activeStyleId === style.id && pickerOpen}
                onPress={() => openStylePicker(style.id)}
                className="max-md:gap-1 max-md:[&_p]:text-xs"
              />
            ))}
          </div>
        </div>
      </KioskBody>

      <Dialog
        open={pickerOpen}
        onOpenChange={(open) => {
          if (!open) closeStylePicker();
        }}
      >
        <DialogContent className="max-w-sm gap-0 rounded-3xl border-border p-0 sm:max-w-md">
          {activeStyle ? (
            <div className="flex max-h-[min(85dvh,calc(100dvh-2rem))] flex-col gap-3 overflow-y-auto p-4 sm:gap-4 sm:p-6">
              <DialogHeader className="items-center gap-2 pr-8 text-center sm:items-center sm:text-center">
                {activeStyle.coverSrc ? (
                  <div className="size-16 overflow-hidden rounded-xl bg-white sm:size-20">
                    <img
                      src={activeStyle.coverSrc}
                      alt={activeStyle.name}
                      className="size-full object-contain"
                      draggable={false}
                    />
                  </div>
                ) : (
                  <span className="text-4xl leading-none sm:text-5xl" aria-hidden>
                    {activeStyle.emoji}
                  </span>
                )}
                <DialogTitle className="text-xl font-bold sm:text-2xl">
                  {activeStyle.name}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground sm:text-base">
                  {activeStyle.optionGroups?.some((g) => g.id === "hero")
                    ? "Выберите героя, стиль и позу"
                    : activeStyle.optionGroups?.length === 1 &&
                        activeStyle.optionGroups[0].id === "face"
                      ? "Выберите вариант лица"
                      : activeStyle.optionGroups
                        ? "Выберите стиль и позу"
                        : "Добавьте опции к стилю"}
                </DialogDescription>
              </DialogHeader>

              {activeStyle.optionGroups ? (
                <div className="flex flex-col gap-3 sm:gap-4">
                  {activeStyle.optionGroups.map((group) => (
                    <div key={group.id} className="flex flex-col gap-1.5">
                      <p className="text-center text-xs font-semibold text-muted-foreground sm:text-sm">
                        {group.label}
                      </p>
                      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                        {group.options.map((option) => (
                          <Chip
                            key={option}
                            className="cursor-pointer px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base"
                            color={
                              selectedOptions.includes(option) ? "accent" : "default"
                            }
                            onClick={() => toggleGroupedOption(group, option)}
                          >
                            {selectedOptions.includes(option) && (
                              <Check className="mr-1 inline size-4" />
                            )}
                            <Chip.Label>{option}</Chip.Label>
                          </Chip>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                  {activeStyle.options?.map((option) => (
                    <Chip
                      key={option}
                      className="cursor-pointer px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base"
                      color={selectedOptions.includes(option) ? "accent" : "default"}
                      onClick={() => toggleFlatOption(option)}
                    >
                      {selectedOptions.includes(option) && (
                        <Check className="mr-1 inline size-4" />
                      )}
                      <Chip.Label>{option}</Chip.Label>
                    </Chip>
                  ))}
                </div>
              )}

              <DialogFooter className="flex-col gap-2 sm:flex-col sm:gap-3">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full sm:h-12 sm:text-base"
                  isDisabled={!canContinue}
                  onPress={handleContinue}
                >
                  Продолжить
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full sm:h-12 sm:text-base"
                  onPress={closeStylePicker}
                >
                  Отмена
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </KioskScreen>
  );
}
