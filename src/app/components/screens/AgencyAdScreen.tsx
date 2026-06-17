import type { ReactNode } from "react";
import { Award, Globe, Phone } from "lucide-react";
import { cn } from "@heroui/react";
import { AGENCY, getInteractivesHighlight } from "../../config/agency";
import { KioskScreen } from "../kiosk";
import agencyLogo from "../../../../logo_1.png?url";
import qrPhoneSvg from "../../../../qr_phone.svg?url";

type AgencyAdScreenProps = {
  onScreenTap: () => void;
};

type LayoutVariant = "portrait" | "landscape";

function splitHeadline(headline: string): [string, string] {
  const marker = " в ";
  const idx = headline.indexOf(marker);
  if (idx === -1) return [headline, ""];
  return [headline.slice(0, idx), headline.slice(idx + 1)];
}

function AdHeader({ variant }: { variant: LayoutVariant }) {
  const isPortrait = variant === "portrait";
  const [headlineTop, headlineBottom] = splitHeadline(AGENCY.headline);

  return (
    <header className="w-full shrink-0">
      <div
        className={cn(
          "flex items-center",
          isPortrait ? "gap-2.5 portrait:gap-3" : "gap-4 lg:gap-5"
        )}
      >
        <img
          src={agencyLogo}
          alt={AGENCY.name}
          className={cn(
            "h-auto w-auto shrink-0 object-contain",
            isPortrait
              ? "portrait:h-[clamp(5rem,13vh,7.5rem)] portrait:max-w-[36vw]"
              : "landscape:h-[clamp(5.5rem,13vh,8.5rem)] landscape:max-w-[28vw] landscape:lg:h-[clamp(6.5rem,15vh,10rem)] landscape:lg:max-w-[24vw]"
          )}
          draggable={false}
          decoding="async"
        />
        <h1
          className={cn(
            "min-w-0 flex-1 font-extrabold leading-[1.05] text-white",
            isPortrait
              ? "portrait:text-[clamp(1.2rem,3.6vh,1.75rem)]"
              : "landscape:text-[clamp(1.75rem,4.5vh,2.75rem)] landscape:lg:text-[clamp(2rem,5vh,3.25rem)] landscape:xl:text-[clamp(2.25rem,5.5vh,3.75rem)]"
          )}
        >
          {headlineTop}
          {headlineBottom ? (
            <>
              <br />
              {headlineBottom}
            </>
          ) : null}
        </h1>
      </div>
      <div
        className={cn(
          "mt-2 flex w-full justify-center",
          isPortrait ? "portrait:mt-2.5" : "landscape:mt-3 landscape:lg:mt-4"
        )}
      >
        <div
          className={cn(
            "inline-flex max-w-full items-center justify-center gap-2 rounded-2xl",
            "border border-amber-400/35 bg-amber-400/12 text-center",
            "shadow-lg shadow-black/15 backdrop-blur-md",
            "leading-snug text-amber-50",
            isPortrait
              ? "px-3 py-2 text-[clamp(0.85rem,2.2vh,1.05rem)]"
              : "px-4 py-2.5 text-[clamp(0.9rem,2.2vh,1.1rem)] landscape:lg:px-5 landscape:lg:py-3 landscape:lg:text-[clamp(1rem,2.4vh,1.2rem)]"
          )}
        >
          <Award
            className={cn(
              "shrink-0 text-amber-300",
              isPortrait ? "size-4 portrait:size-5" : "size-5 landscape:lg:size-6"
            )}
            aria-hidden
          />
          <span>{AGENCY.award}</span>
        </div>
      </div>
    </header>
  );
}

function FactCard({
  children,
  variant,
  className,
}: {
  children: ReactNode;
  variant: LayoutVariant;
  className?: string;
}) {
  const isPortrait = variant === "portrait";

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/25 bg-white/12 text-center shadow-lg shadow-black/15 backdrop-blur-md",
        isPortrait
          ? "px-2.5 py-2"
          : "px-3 py-2.5 landscape:lg:px-4 landscape:lg:py-3",
        className
      )}
    >
      {children}
    </div>
  );
}

function HighlightsGrid({ variant }: { variant: LayoutVariant }) {
  const isPortrait = variant === "portrait";

  return (
    <div
      className={cn(
        "grid w-full shrink-0 grid-cols-2",
        isPortrait ? "gap-2.5" : "gap-3 landscape:lg:gap-4 landscape:xl:gap-5"
      )}
    >
      <FactCard variant={variant}>
        <p
          className={cn(
            "font-semibold leading-snug text-white",
            isPortrait
              ? "text-[clamp(0.85rem,2.2vh,1rem)]"
              : "text-[clamp(0.95rem,2.3vh,1.15rem)] landscape:lg:text-[clamp(1.05rem,2.5vh,1.3rem)]"
          )}
        >
          {getInteractivesHighlight()}
        </p>
      </FactCard>
      <FactCard variant={variant}>
        <p
          className={cn(
            "font-semibold leading-snug text-white",
            isPortrait
              ? "text-[clamp(0.85rem,2.2vh,1rem)]"
              : "text-[clamp(0.95rem,2.3vh,1.15rem)] landscape:lg:text-[clamp(1.05rem,2.5vh,1.3rem)]"
          )}
        >
          {AGENCY.guidesHighlight}
        </p>
      </FactCard>
      {AGENCY.stats.map((stat) => (
        <FactCard key={stat.label} variant={variant}>
          <p
            className={cn(
              "font-bold leading-tight text-white",
              isPortrait
                ? "text-[clamp(1.1rem,3vh,1.45rem)]"
                : "text-[clamp(1.2rem,3.2vh,1.65rem)] landscape:lg:text-[clamp(1.35rem,3.6vh,1.9rem)]"
            )}
          >
            {stat.value}
          </p>
          <p
            className={cn(
              "mt-0.5 leading-tight text-white/75",
              isPortrait
                ? "text-[clamp(0.72rem,1.8vh,0.9rem)]"
                : "text-[clamp(0.78rem,1.9vh,0.95rem)] landscape:lg:text-[clamp(0.85rem,2vh,1.05rem)]"
            )}
          >
            {stat.label}
          </p>
        </FactCard>
      ))}
    </div>
  );
}

function QrFrame({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl bg-white p-2 shadow-2xl shadow-violet-900/50 ring-4 ring-amber-400/80",
        "landscape:lg:p-2.5 landscape:xl:p-3",
        className
      )}
    >
      <img
        src={qrPhoneSvg}
        alt=""
        className="block h-auto w-full"
        width={696}
        height={696}
        decoding="async"
      />
    </div>
  );
}

function ImmerseCta({ variant }: { variant: LayoutVariant }) {
  const isPortrait = variant === "portrait";

  return (
    <p
      className={cn(
        "shrink-0 text-center font-bold leading-snug text-amber-300",
        isPortrait
          ? "text-[clamp(1.05rem,3vh,1.45rem)]"
          : "text-[clamp(1.25rem,3.5vh,1.85rem)] landscape:lg:text-[clamp(1.5rem,4vh,2.25rem)] landscape:xl:text-[clamp(1.75rem,4.5vh,2.75rem)]"
      )}
    >
      {AGENCY.immerseCta}
    </p>
  );
}

function AdFooter({ variant }: { variant: LayoutVariant }) {
  if (!AGENCY.phoneDisplay && !AGENCY.websiteLabel) return null;

  const isPortrait = variant === "portrait";

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2",
        isPortrait ? "items-center pb-0.5" : "items-center"
      )}
    >
      {AGENCY.phoneDisplay ? (
        <p
          className={cn(
            "inline-flex items-center gap-2 font-extrabold text-white",
            isPortrait
              ? "text-[clamp(1.35rem,3.8vh,1.75rem)]"
              : "text-[clamp(1.5rem,4vh,2rem)] landscape:lg:text-[clamp(1.75rem,4.5vh,2.35rem)]"
          )}
        >
          <Phone
            className={cn(
              "shrink-0",
              isPortrait ? "size-6 portrait:size-7" : "size-7 landscape:lg:size-8"
            )}
            aria-hidden
          />
          {AGENCY.phoneDisplay}
        </p>
      ) : null}
      <p
        className={cn(
          "inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2",
          "font-bold text-[#1a1040] shadow-lg shadow-amber-400/30",
          isPortrait
            ? "text-base"
            : "text-[clamp(0.95rem,2.2vh,1.1rem)] landscape:lg:px-5 landscape:lg:py-2.5 landscape:lg:text-lg"
        )}
      >
        <Globe className={cn(isPortrait ? "size-5" : "size-5 landscape:lg:size-6")} aria-hidden />
        {AGENCY.websiteLabel}
      </p>
    </div>
  );
}

function PortraitLayout() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 portrait:flex landscape:hidden">
      <AdHeader variant="portrait" />
      <HighlightsGrid variant="portrait" />
      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2 py-1">
        <ImmerseCta variant="portrait" />
        <QrFrame className="w-[min(44vw,200px)]" />
      </div>
      <AdFooter variant="portrait" />
    </div>
  );
}

function LandscapeLayout() {
  return (
    <div className="hidden h-full min-h-0 w-full landscape:grid landscape:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] landscape:items-center landscape:gap-6 landscape:lg:gap-10 landscape:xl:gap-14">
      <div className="flex min-h-0 flex-col justify-center gap-3 landscape:lg:gap-4 landscape:xl:gap-5">
        <AdHeader variant="landscape" />
        <HighlightsGrid variant="landscape" />
      </div>
      <div className="flex min-h-0 flex-col items-center justify-center gap-4 landscape:lg:gap-5 landscape:xl:gap-6">
        <ImmerseCta variant="landscape" />
        <QrFrame className="w-[min(24vh,220px)] landscape:lg:w-[min(28vh,280px)] landscape:xl:w-[min(32vh,320px)]" />
        <AdFooter variant="landscape" />
      </div>
    </div>
  );
}

export function AgencyAdScreen({ onScreenTap }: AgencyAdScreenProps) {
  return (
    <KioskScreen
      className="relative h-full min-h-0 cursor-pointer overflow-hidden bg-[#0c0824]"
      contentClassName={cn(
        "relative mx-auto flex h-full w-full min-h-0 flex-col",
        "max-w-5xl !gap-0 !p-3 portrait:!py-2",
        "landscape:max-w-6xl landscape:!p-4 landscape:lg:max-w-7xl landscape:lg:!p-8 landscape:xl:max-w-[88rem] landscape:xl:!p-10"
      )}
    >
      <button
        type="button"
        className="absolute inset-0 z-20 cursor-pointer border-0 bg-transparent"
        aria-label="Открыть экран авторизации гида"
        onClick={onScreenTap}
      />
      <div
        className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-violet-500/30 blur-3xl sm:size-72 landscape:lg:size-96"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-12 size-64 rounded-full bg-fuchsia-500/25 blur-3xl sm:size-80 landscape:lg:size-96"
        aria-hidden
      />

      <div className="relative z-10 h-full min-h-0 w-full pointer-events-none">
        <PortraitLayout />
        <LandscapeLayout />
      </div>
    </KioskScreen>
  );
}
