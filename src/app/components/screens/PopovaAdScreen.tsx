import { Phone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@heroui/react";
import { AGENCY, getInteractivesHighlight } from "../../config/agency";
import { KioskScreen } from "../kiosk";
import agencyLogo from "../../../assets/visitinno-logo.svg?url";

const LANDING_URL = "https://visitinno.ru/";
const PHONE_LABEL = "+7 995 363-54-10";

type PopovaAdScreenProps = {
  onScreenTap: () => void;
};

function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={agencyLogo}
      alt={AGENCY.name}
      className={cn(
        "block h-[clamp(2.35rem,5.5vh,6rem)] w-auto max-w-[70%] object-contain object-left",
        className,
      )}
      draggable={false}
      decoding="async"
    />
  );
}

function SiteHeadline({ className }: { className?: string }) {
  return (
    <h1
      className={cn(
        "flex flex-col items-start gap-[0.22em] font-black uppercase leading-none tracking-tight text-black text-[clamp(1.7rem,min(5.2vh,8.6vw),3.4rem)]",
        className,
      )}
    >
      <span className="whitespace-nowrap">Интересные</span>
      <span className="whitespace-nowrap">экскурсии</span>
      <span className="mt-[0.12em] inline-block -skew-x-6 whitespace-nowrap bg-[#baa3d6] px-2 py-1">
        <span className="inline-block skew-x-6">в Иннополисе</span>
      </span>
    </h1>
  );
}

function StatGrid({ roomy = false }: { roomy?: boolean }) {
  return (
    <div className={cn("grid shrink-0 grid-cols-2", roomy ? "gap-4" : "gap-2")}>
      {AGENCY.stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            "@container min-w-0 rounded-2xl bg-[#f2f1f1]",
            roomy ? "px-6 py-5" : "px-4 py-3",
          )}
        >
          <p className="whitespace-nowrap font-black leading-none tracking-tight text-black text-[clamp(1.15rem,14cqi,3.25rem)]">
            {stat.value}
          </p>
          <p
            className={cn(
              "mt-1 leading-tight text-black/70",
              roomy
                ? "mt-2 text-[clamp(0.95rem,2.1vh,1.2rem)]"
                : "text-[clamp(0.72rem,1.6vh,0.9rem)]",
            )}
          >
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function FactLines({ roomy = false }: { roomy?: boolean }) {
  return (
    <div
      className={cn(
        "shrink-0 font-medium leading-snug text-black",
        roomy
          ? "space-y-2 text-[clamp(1.15rem,2.6vh,1.55rem)]"
          : "space-y-1 text-[clamp(0.78rem,1.8vh,1rem)]",
      )}
    >
      <p>{getInteractivesHighlight()}</p>
      <p>{AGENCY.guidesHighlight}</p>
    </div>
  );
}

function SiteButton({ roomy = false }: { roomy?: boolean }) {
  return (
    <p
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-2 rounded-[10px] bg-[#eb6941] font-semibold text-white",
        roomy
          ? "gap-3 px-6 py-3.5 text-[clamp(1.2rem,2.8vh,1.75rem)]"
          : "px-4 py-2 text-[clamp(0.95rem,2.2vh,1.25rem)]",
      )}
    >
      <Phone className={cn("shrink-0", roomy ? "size-7" : "size-5")} aria-hidden />
      {PHONE_LABEL}
    </p>
  );
}

function QrMark({ className }: { className?: string }) {
  return (
    <div className={cn("aspect-square max-h-full max-w-full rounded-2xl bg-white p-1.5 shadow-md", className)}>
      <QRCodeSVG
        value={LANDING_URL}
        title={LANDING_URL}
        level="M"
        size={280}
        bgColor="#ffffff"
        fgColor="#111111"
        className="block size-full"
      />
    </div>
  );
}

export function PopovaAdScreen({ onScreenTap }: PopovaAdScreenProps) {
  return (
    <KioskScreen
      className="relative h-full min-h-0 cursor-pointer overflow-hidden bg-white"
      contentClassName="relative mx-auto flex h-full min-h-0 w-full max-w-none flex-col !gap-0 !p-0"
    >
      <button
        type="button"
        className="absolute inset-0 z-20 cursor-pointer border-0 bg-transparent"
        aria-label="Открыть экран авторизации гида"
        onClick={onScreenTap}
      />

      <div className="pointer-events-none relative z-10 flex h-full min-h-0 w-full flex-col">
        <header className="mx-4 mt-4 flex shrink-0 items-center rounded-lg bg-[#352e87] px-5 py-2 shadow-lg shadow-[#352e87]/30 sm:mx-5">
          <LogoMark />
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-[clamp(0.85rem,2.2vh,1.5rem)] portrait:flex landscape:hidden">
          <div className="min-h-0 flex-[0.62]" />
          <div className="flex shrink-0 flex-col gap-[1.6vh]">
            <SiteHeadline />
            <p className="shrink-0 text-[clamp(1rem,2.4vh,1.35rem)] font-medium leading-snug text-black/80">
              Погружаем в мир науки и технологий!
            </p>
          </div>
          <div className="mt-[clamp(1.15rem,2.8vh,3rem)] flex shrink-0 flex-col gap-[clamp(0.9rem,2.2vh,2.25rem)]">
            <StatGrid />
            <FactLines />
          </div>
          <div className="min-h-[clamp(0.85rem,2vh,1.5rem)] flex-[0.38]" />
          <div className="flex shrink-0 flex-col items-center gap-3">
            <SiteButton />
            <QrMark className="w-[min(50vw,24vh,280px)]" />
          </div>
          <div className="min-h-[clamp(0.65rem,1.8vh,1.35rem)] flex-[0.72]" />
        </div>

        <div className="hidden h-full min-h-0 flex-1 items-center overflow-hidden px-8 pb-[clamp(1rem,3vh,2rem)] pt-[clamp(1.75rem,6vh,4.25rem)] landscape:grid landscape:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] landscape:gap-x-10">
          <div className="flex min-h-0 flex-col justify-center gap-[clamp(1.1rem,3.2vh,2.25rem)]">
            <SiteHeadline className="text-[clamp(2.7rem,min(8.4vh,4.6vw),5.4rem)]" />
            <p className="max-w-[16em] text-[clamp(1.2rem,2.8vh,1.85rem)] font-medium leading-snug text-black/80">
              Погружаем в мир науки и технологий!
            </p>
            <SiteButton roomy />
          </div>
          <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-8">
            <div className="flex min-h-0 flex-col justify-center gap-[clamp(1.15rem,3.4vh,2.4rem)]">
              <StatGrid roomy />
              <FactLines roomy />
            </div>
            <QrMark className="w-[min(38vh,340px)]" />
          </div>
        </div>
      </div>
    </KioskScreen>
  );
}
