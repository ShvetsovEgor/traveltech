import { useCallback, useRef, useState } from "react";
import { Gamepad2, X } from "lucide-react";
import { Button, Typography } from "@heroui/react";
import { KioskBody, KioskHeader, KioskScreen, SelectionCard } from "../kiosk";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";
import { useGameKeyboardForward } from "../../hooks/useGameKeyboardForward";
import { MintimerGameFrame } from "./MintimerGameFrame";
import { RoverLidarGameFrame } from "./RoverLidarGameFrame";
import mintimerCover from "../../../../mintimer.png";
import roverCover from "../../../../rover_yandex.png";

type GameId = "mintimer" | "rover-lidar";

const games: {
  id: GameId;
  name: string;
  description: string;
  coverSrc: string;
  hint?: string;
}[] = [
  {
    id: "mintimer",
    name: "Миссия Мин-Тимера",
    description: "Прыжок и присед — управление ровером",
    coverSrc: mintimerCover,
    hint: "Верх экрана — прыжок, низ — присесть (удерживать)",
  },
  {
    id: "rover-lidar",
    name: "Лидарная симуляция Иннополиса",
    description: "3D-ровер, LiDAR и карта города",
    coverSrc: roverCover,
    hint: "Стрелки — езда, L — LiDAR, 1 и 2 — смена скина",
  },
];

export function MiniGames() {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const active = games.find((g) => g.id === activeGame);

  useGameKeyboardForward(iframeRef, activeGame !== null);

  const focusGame = useCallback(() => {
    iframeRef.current?.focus();
  }, []);

  return (
    <KioskScreen backTo="/">
      <KioskHeader
        compact
        centered={false}
        title="Мини-игры"
        subtitle="Выберите игру"
        icon={<Gamepad2 />}
      />

      <KioskBody>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
          {games.map((game) => (
            <SelectionCard
              key={game.id}
              title={game.name}
              description={game.description}
              coverSrc={game.coverSrc}
              coverAlt={game.name}
              selected={activeGame === game.id}
              onPress={() => setActiveGame(game.id)}
            />
          ))}
        </div>
      </KioskBody>

      <Dialog
        modal={false}
        open={activeGame !== null}
        onOpenChange={(open) => {
          if (!open) setActiveGame(null);
        }}
      >
        {active && (
          <DialogContent
            fullscreen
            hideClose
            className="bg-[#0a0a12]"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              focusGame();
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
            }}
          >
            <DialogTitle className="sr-only">{active.name}</DialogTitle>
            {active.hint && (
              <DialogDescription className="sr-only">{active.hint}</DialogDescription>
            )}

            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-6">
              <Typography.Heading level={4} className="text-white">
                {active.name}
              </Typography.Heading>
              <Button
                isIconOnly
                variant="ghost"
                className="text-white hover:bg-white/10"
                aria-label="Закрыть игру"
                onPress={() => setActiveGame(null)}
              >
                <X className="size-6" />
              </Button>
            </div>

            <div
              className="relative min-h-0 flex-1"
              onPointerDown={focusGame}
            >
              {activeGame === "mintimer" && (
                <MintimerGameFrame
                  ref={iframeRef}
                  className="absolute inset-0 size-full"
                />
              )}
              {activeGame === "rover-lidar" && (
                <RoverLidarGameFrame
                  ref={iframeRef}
                  className="absolute inset-0 size-full"
                />
              )}
            </div>

            {active.hint && (
              <Typography.Paragraph className="shrink-0 border-t border-white/10 px-4 py-2.5 text-center text-sm text-white/70 md:py-3">
                {active.hint}
              </Typography.Paragraph>
            )}
          </DialogContent>
        )}
      </Dialog>
    </KioskScreen>
  );
}
