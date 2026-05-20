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
    id: "anime",
    name: "Аниме",
    coverSrc: "/static/neuro_styles/anime.png",
    options: ["Яркие цвета", "Большие глаза"],
  },
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
    id: "mem",
    name: "Мем",
    coverSrc: "/static/neuro_styles/mem.png",
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
          "Реалистичное лицо + мультяшное тело",
          "Легкая стилизация лица (допустима)",
          "Полностью мультяшное лицо, но черты сохранены",
        ],
      },
    ],
  },
];

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

  const handleContinue = () => {
    if (!activeStyleId || !activeStyle) return;
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
        subtitle="Преобразите своё лицо в разных стилях и мемах"
        icon={<Box />}
      />

      <KioskBody>
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {styles.map((style) => (
              <SelectionCard
                key={style.id}
                title={style.name}
                coverSrc={style.coverSrc}
                coverAlt={style.name}
                selected={activeStyleId === style.id && pickerOpen}
                onPress={() => openStylePicker(style.id)}
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
        <DialogContent className="max-w-md gap-5 rounded-3xl border-border p-6 sm:max-w-lg sm:p-8">
          {activeStyle && (
            <>
              <DialogHeader className="items-center gap-3 text-center sm:items-center sm:text-center">
                {activeStyle.coverSrc ? (
                  <div className="size-24 overflow-hidden rounded-xl bg-default-100">
                    <img
                      src={activeStyle.coverSrc}
                      alt={activeStyle.name}
                      className="size-full object-contain"
                      draggable={false}
                    />
                  </div>
                ) : (
                  <span className="text-6xl leading-none" aria-hidden>
                    {activeStyle.emoji}
                  </span>
                )}
                <DialogTitle className="text-2xl font-bold sm:text-3xl">
                  {activeStyle.name}
                </DialogTitle>
                <DialogDescription className="text-base text-muted-foreground">
                  {activeStyle.optionGroups?.length === 1 &&
                  activeStyle.optionGroups[0].id === "face"
                    ? "Выберите вариант лица"
                    : activeStyle.optionGroups
                      ? "Выберите стиль и позу"
                      : "Добавьте опции к стилю"}
                </DialogDescription>
              </DialogHeader>

              {activeStyle.optionGroups ? (
                <div className="flex flex-col gap-5">
                  {activeStyle.optionGroups.map((group) => (
                    <div key={group.id} className="flex flex-col gap-2">
                      <p className="text-center text-sm font-semibold text-muted-foreground">
                        {group.label}
                      </p>
                      <div className="flex flex-wrap justify-center gap-3">
                        {group.options.map((option) => (
                          <Chip
                            key={option}
                            className="cursor-pointer px-4 py-2.5 text-base"
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
                <div className="flex flex-wrap justify-center gap-3">
                  {activeStyle.options?.map((option) => (
                    <Chip
                      key={option}
                      className="cursor-pointer px-4 py-2.5 text-base"
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

              <DialogFooter className="flex-col gap-3 sm:flex-col">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onPress={handleContinue}
                >
                  Продолжить
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  onPress={closeStylePicker}
                >
                  Отмена
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </KioskScreen>
  );
}
