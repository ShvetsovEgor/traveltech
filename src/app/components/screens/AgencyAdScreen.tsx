import { ArrowRight, Award, Globe, Phone } from "lucide-react";
import { Chip, Typography, cn } from "@heroui/react";
import { AGENCY, getInteractivesHighlight } from "../../config/agency";
import { KioskScreen } from "../kiosk";
import qrPhoneSvg from "../../../../qr_phone.svg?url";

type AgencyAdScreenProps = {
  onScreenTap: () => void;
};

function AdHeader({ className }: { className?: string }) {
  return (
    <header className={cn("w-full shrink-0", className)}>
      <Chip className="mb-1.5 bg-amber-400/20 text-amber-100 portrait:mb-2">
        <Chip.Label className="text-sm font-semibold uppercase tracking-wide portrait:text-base landscape:text-sm">
          {AGENCY.name}
        </Chip.Label>
      </Chip>
      <Typography.Heading
        level={1}
        className={cn(
          "font-extrabold leading-[1.08] text-white",
          "portrait:text-[clamp(2rem,6.2vh,3rem)]",
          "landscape:text-[clamp(1.75rem,4.5vh,2.75rem)]"
        )}
      >
        {AGENCY.headline}
      </Typography.Heading>
      <p
        className={cn(
          "mt-1.5 flex items-start gap-2 text-left leading-snug text-amber-100/95",
          "portrait:mt-2 portrait:text-[clamp(1rem,2.6vh,1.25rem)]",
          "landscape:mt-1.5 landscape:text-[clamp(0.875rem,2.2vh,1.05rem)]"
        )}
      >
        <Award
          className="mt-0.5 size-5 shrink-0 text-amber-300 portrait:size-6"
          aria-hidden
        />
        <span>{AGENCY.award}</span>
      </p>
    </header>
  );
}

function HighlightsGrid({ variant }: { variant: "portrait" | "landscape" }) {
  const isPortrait = variant === "portrait";

  return (
    <div
      className={cn(
        "w-full shrink-0",
        isPortrait
          ? "grid grid-cols-2 gap-x-4 gap-y-3"
          : "flex items-start justify-between gap-4 lg:gap-6"
      )}
    >
      <p
        className={cn(
          "font-semibold leading-snug text-white",
          isPortrait
            ? "text-center text-[clamp(1rem,2.5vh,1.2rem)]"
            : "max-w-[14rem] flex-1 text-center text-[clamp(0.9rem,2vh,1.05rem)]"
        )}
      >
        {getInteractivesHighlight()}
      </p>
      <p
        className={cn(
          "font-semibold leading-snug text-white",
          isPortrait
            ? "text-center text-[clamp(1rem,2.5vh,1.2rem)]"
            : "max-w-[11rem] flex-1 text-center text-[clamp(0.9rem,2vh,1.05rem)]"
        )}
      >
        {AGENCY.guidesHighlight}
      </p>
      {AGENCY.stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(isPortrait ? "text-center" : "flex-1 text-center")}
        >
          <p
            className={cn(
              "font-bold leading-tight text-white",
              isPortrait
                ? "text-[clamp(1.35rem,3.8vh,1.75rem)]"
                : "text-[clamp(1.125rem,2.8vh,1.5rem)]"
            )}
          >
            {stat.value}
          </p>
          <p
            className={cn(
              "mt-0.5 leading-tight text-white/75",
              isPortrait
                ? "text-[clamp(0.8rem,2vh,1rem)]"
                : "text-[clamp(0.7rem,1.6vh,0.875rem)]"
            )}
          >
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function CtaBlock({ variant }: { variant: "portrait" | "landscape" }) {
  const isPortrait = variant === "portrait";

  return (
    <div
      className={cn(
        "flex w-full shrink-0 items-center justify-center",
        isPortrait ? "flex-col gap-3" : "flex-row gap-5"
      )}
    >
      <p
        className={cn(
          "font-bold leading-snug text-amber-300",
          isPortrait
            ? "text-center text-[clamp(1.35rem,4vh,2rem)]"
            : "max-w-[14rem] flex-1 text-right text-[clamp(1.125rem,3.2vh,1.75rem)]"
        )}
      >
        {AGENCY.immerseCta}
      </p>

      {!isPortrait && (
        <ArrowRight
          className="size-14 shrink-0 text-amber-400"
          strokeWidth={2.5}
          aria-hidden
        />
      )}

      <div className="flex shrink-0">
        <div
          className={cn(
            "rounded-2xl bg-white p-2 shadow-2xl shadow-violet-900/50 ring-4 ring-amber-400/80",
            isPortrait && "rounded-3xl p-2.5"
          )}
        >
          <img
            src={qrPhoneSvg}
            alt=""
            className={cn(
              "h-auto",
              isPortrait ? "w-[min(52vw,240px)]" : "w-[min(200px,22vw)]"
            )}
            width={696}
            height={696}
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}

function AdFooter({ variant }: { variant: "portrait" | "landscape" }) {
  if (!AGENCY.phoneDisplay && !AGENCY.websiteLabel) return null;

  const isPortrait = variant === "portrait";

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2",
        isPortrait ? "items-start gap-2.5" : "items-center landscape:items-start"
      )}
    >
      {AGENCY.phoneDisplay ? (
        <p
          className={cn(
            "inline-flex items-center gap-2 font-extrabold text-white",
            isPortrait
              ? "text-[clamp(1.75rem,5vh,2.25rem)]"
              : "text-[clamp(1.5rem,4vh,2rem)]"
          )}
        >
          <Phone className="size-7 shrink-0 portrait:size-8" aria-hidden />
          {AGENCY.phoneDisplay}
        </p>
      ) : null}
      <p
        className={cn(
          "inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2",
          "font-bold text-[#1a1040] shadow-lg shadow-amber-400/30",
          isPortrait
            ? "px-5 py-2.5 text-lg"
            : "text-[clamp(0.95rem,2.2vh,1.05rem)]"
        )}
      >
        <Globe className="size-5 portrait:size-6" aria-hidden />
        {AGENCY.websiteLabel}
      </p>
    </div>
  );
}

function PortraitLayout() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col justify-between gap-3 portrait:flex landscape:hidden">
      <AdHeader className="text-left" />
      <div className="flex min-h-0 flex-1 flex-col justify-evenly gap-4">
        <HighlightsGrid variant="portrait" />
        <CtaBlock variant="portrait" />
      </div>
      <AdFooter variant="portrait" />
    </div>
  );
}

function LandscapeLayout() {
  return (
    <div className="hidden h-full min-h-0 w-full flex-col justify-between gap-3 landscape:flex">
      <AdHeader className="text-left" />
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-5">
        <HighlightsGrid variant="landscape" />
        <CtaBlock variant="landscape" />
      </div>
      <AdFooter variant="landscape" />
    </div>
  );
}

export function AgencyAdScreen({ onScreenTap }: AgencyAdScreenProps) {
  return (
    <KioskScreen
      className="relative h-full min-h-0 cursor-pointer overflow-hidden bg-[#0c0824]"
      contentClassName={cn(
        "relative mx-auto flex h-full w-full min-h-0 max-w-5xl flex-col",
        "!gap-0 !p-3 portrait:!py-2 landscape:!p-4 landscape:lg:!p-6"
      )}
    >
      <button
        type="button"
        className="absolute inset-0 z-20 cursor-pointer border-0 bg-transparent"
        aria-label="Открыть экран авторизации гида"
        onClick={onScreenTap}
      />
      <div
        className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-violet-500/30 blur-3xl sm:size-72"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-12 size-64 rounded-full bg-fuchsia-500/25 blur-3xl sm:size-80"
        aria-hidden
      />

      <div className="relative z-10 h-full min-h-0 w-full pointer-events-none">
        <PortraitLayout />
        <LandscapeLayout />
      </div>
    </KioskScreen>
  );
}
