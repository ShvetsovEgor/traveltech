import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import { Card, Surface, Typography } from "@heroui/react";
import { KioskHeader, KioskScreen, SelectionCard } from "../kiosk";
import { MintimerGameFrame } from "./MintimerGameFrame";

const games = [
  {
    id: "snake",
    name: "Змейка",
    emoji: "🐍",
    description: "Классическая игра",
  },
  {
    id: "tetris",
    name: "Тетрис",
    emoji: "🟦",
    description: "Собирайте линии",
  },
  {
    id: "rover",
    name: "Приключения МинТимера",
    emoji: "🛞",
    description: "Ровер: прыжок и присед",
  },
];

export function MiniGames() {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  const selected = games.find((g) => g.id === selectedGame);

  return (
    <KioskScreen backTo="/menu">
      <KioskHeader
        title="Мини-игры"
        subtitle="Выберите игру"
        icon={<Gamepad2 className="size-20" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto mb-8">
        {games.map((game) => (
          <SelectionCard
            key={game.id}
            title={game.name}
            description={game.description}
            emoji={game.emoji}
            selected={selectedGame === game.id}
            onPress={() => setSelectedGame(game.id)}
          />
        ))}
      </div>

      {selectedGame === "rover" && (
        <div className="max-w-6xl mx-auto">
          <div className="relative aspect-video min-h-[320px] md:min-h-[420px] rounded-2xl overflow-hidden shadow-2xl ring-2 ring-accent/20">
            <MintimerGameFrame className="absolute inset-0 w-full h-full" />
          </div>
          <Typography.Paragraph className="text-center text-muted text-sm mt-3">
            Верх экрана — прыжок, низ — присесть (удерживать)
          </Typography.Paragraph>
        </div>
      )}

      {selectedGame && selectedGame !== "rover" && (
        <Surface variant="secondary" className="rounded-3xl p-8 max-w-4xl mx-auto">
          <Card className="aspect-[4/3] flex items-center justify-center bg-default-100 border-0 shadow-none">
            <div className="text-center">
              <span className="text-7xl mb-4 block">{selected?.emoji}</span>
              <Typography.Heading level={3}>
                Игра «{selected?.name}»
              </Typography.Heading>
              <Typography.Paragraph className="text-muted mt-2">
                Скоро
              </Typography.Paragraph>
            </div>
          </Card>
        </Surface>
      )}
    </KioskScreen>
  );
}
