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

const styles = [
  { id: "anime", name: "Аниме", emoji: "🎌", options: ["Яркие цвета", "Большие глаза"] },
  { id: "cartoon", name: "Мультяшный", emoji: "🎬", options: ["3D стиль", "Пиксельный"] },
  { id: "renaissance", name: "Ренессанс", emoji: "🖼️", options: ["Классика", "Барокко"] },
  { id: "cyberpunk", name: "Киберпанк", emoji: "🤖", options: ["Неон", "Темный фон"] },
  { id: "zombie", name: "Зомби", emoji: "🧟", options: ["Страшный", "Веселый"] },
  { id: "superhero", name: "Супергерой", emoji: "🦸", options: ["Marvel", "DC"] },
];

export function NeuralBox() {
  const navigate = useNavigate();
  const [activeStyleId, setActiveStyleId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const activeStyle = styles.find((s) => s.id === activeStyleId);

  const openStylePicker = (styleId: string) => {
    setActiveStyleId(styleId);
    setSelectedOptions([]);
    setPickerOpen(true);
  };

  const closeStylePicker = () => {
    setPickerOpen(false);
    setActiveStyleId(null);
    setSelectedOptions([]);
  };

  const toggleOption = (option: string) => {
    setSelectedOptions((prev) =>
      prev.includes(option)
        ? prev.filter((o) => o !== option)
        : [...prev, option]
    );
  };

  const handleContinue = () => {
    if (!activeStyleId) return;
    navigate("/neural-box/gender", {
      state: { style: activeStyleId, options: selectedOptions },
    });
  };

  return (
    <KioskScreen backTo="/">
      <KioskHeader
        compact
        centered={false}
        title="Нейробокс"
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
                emoji={style.emoji}
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
                <span className="text-6xl leading-none" aria-hidden>
                  {activeStyle.emoji}
                </span>
                <DialogTitle className="text-2xl font-bold sm:text-3xl">
                  {activeStyle.name}
                </DialogTitle>
                <DialogDescription className="text-base text-muted-foreground">
                  Добавьте опции к стилю
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap justify-center gap-3">
                {activeStyle.options.map((option) => (
                  <Chip
                    key={option}
                    className="cursor-pointer px-4 py-2.5 text-base"
                    color={selectedOptions.includes(option) ? "accent" : "default"}
                    onClick={() => toggleOption(option)}
                  >
                    {selectedOptions.includes(option) && (
                      <Check className="mr-1 inline size-4" />
                    )}
                    <Chip.Label>{option}</Chip.Label>
                  </Chip>
                ))}
              </div>

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
