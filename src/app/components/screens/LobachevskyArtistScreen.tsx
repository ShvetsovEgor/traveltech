import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { cn } from "@heroui/react";
import { assetUrl } from "../../api/client";
import { buildApiUrl } from "../../api/resolveApiBase";
import { KioskScreen } from "../kiosk";

const COLUMNS = 4;

function MarqueeColumn({
  srcs,
  direction,
}: {
  srcs: readonly string[];
  direction: "up" | "down";
}) {
  const loop = [...srcs, ...srcs];

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <div
        className={cn(
          "flex flex-col gap-3 motion-reduce:animate-none",
          direction === "down" ? "animate-marquee-down" : "animate-marquee-up",
        )}
      >
        {loop.map((src, index) => (
          <figure
            key={`${src}-${index}`}
            className="shrink-0 overflow-hidden rounded-3xl bg-black/40"
            aria-hidden={index >= srcs.length}
          >
            <img
              src={src}
              alt=""
              className="h-[34vh] w-full object-cover"
              draggable={false}
            />
          </figure>
        ))}
      </div>
    </div>
  );
}

export function LobachevskyArtistScreen() {
  const navigate = useNavigate();
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(buildApiUrl("/api/artist/showcase"))
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { images?: string[] }) => {
        if (!cancelled) setImages((data.images ?? []).map(assetUrl));
      })
      .catch(() => {
        if (!cancelled) setImages([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = Array.from({ length: COLUMNS }, (_, column) =>
    images.filter((_, index) => index % COLUMNS === column),
  );

  return (
    <KioskScreen
      className="bg-[#0c0824]"
      contentClassName="relative !gap-0 !p-0"
    >
      <div className="grid h-full min-h-0 grid-cols-4 gap-3 p-3">
        {columns.map((srcs, index) =>
          srcs.length > 0 ? (
            <MarqueeColumn
              key={index}
              srcs={srcs}
              direction={index < COLUMNS / 2 ? "down" : "up"}
            />
          ) : (
            <div key={index} />
          ),
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 rounded-3xl bg-[#0c0824]/75 px-14 py-9 shadow-2xl backdrop-blur-xl">
          <h1 className="text-center text-[clamp(3.6rem,6.4vw,6.75rem)] font-black leading-none tracking-tight whitespace-nowrap text-white">
            ИИ-творец
          </h1>
          <button
            type="button"
            className="pointer-events-auto min-h-20 min-w-[18rem] rounded-2xl bg-white px-12 text-[clamp(1.7rem,2.6vw,2.4rem)] font-black tracking-tight text-[#352e87] shadow-2xl transition-transform duration-300 active:scale-95"
            onClick={() => navigate("/neural-artist")}
          >
            Попробовать
          </button>
        </div>
      </div>
    </KioskScreen>
  );
}
