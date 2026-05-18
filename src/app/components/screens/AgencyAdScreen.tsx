import {
  Award,
  Globe,
  MapPin,
  Phone,
  Sparkles,
  Users,
} from "lucide-react";
import { Chip, Typography, cn } from "@heroui/react";
import { AGENCY } from "../../config/agency";
import { KioskScreen } from "../kiosk";
import qrPhoneSvg from "../../../../qr_phone.svg?url";

const STAT_ICONS = [Users, Award, Sparkles] as const;

type AgencyAdScreenProps = {
  onScreenTap: () => void;
};

export function AgencyAdScreen({ onScreenTap }: AgencyAdScreenProps) {
  return (
    <KioskScreen
      className="relative cursor-pointer overflow-x-hidden overflow-y-auto bg-[#0c0824]"
      contentClassName={cn(
        "relative mx-auto flex w-full min-h-0 max-w-5xl flex-col",
        "!p-3 pb-6 sm:!p-5 sm:pb-8 md:!p-8 md:pb-10"
      )}
    >
      <button
        type="button"
        className="absolute inset-0 z-20 cursor-pointer border-0 bg-transparent"
        aria-label="Открыть экран авторизации гида"
        onClick={onScreenTap}
      />
      <div
        className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-violet-500/30 blur-3xl sm:-right-24 sm:-top-24 sm:size-72 md:size-96"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-12 size-64 rounded-full bg-fuchsia-500/25 blur-3xl sm:-bottom-32 sm:-left-16 sm:size-80"
        aria-hidden
      />

      <div className="relative z-10 flex w-full flex-col gap-3 pointer-events-none sm:gap-4 md:gap-5">
        <header className="shrink-0 text-left">
          <Chip className="mb-1.5 bg-amber-400/20 text-amber-100 sm:mb-2">
            <Chip.Label className="text-[10px] font-semibold uppercase tracking-wide min-[400px]:text-xs sm:text-sm">
              {AGENCY.name}
            </Chip.Label>
          </Chip>
          <Typography.Heading
            level={1}
            className="text-xl font-extrabold leading-[1.15] text-white min-[400px]:text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem]"
          >
            {AGENCY.headline}
          </Typography.Heading>
          <Typography.Paragraph className="mt-1.5 text-sm font-medium leading-snug text-violet-100 min-[400px]:mt-2 min-[400px]:text-base sm:text-lg md:text-xl">
            {AGENCY.tagline}
          </Typography.Paragraph>
          <Typography.Paragraph className="mt-1 text-xs leading-snug text-white/75 min-[400px]:text-sm sm:text-base">
            {AGENCY.subheadline}
          </Typography.Paragraph>
        </header>

        <div className="grid shrink-0 grid-cols-3 gap-1.5 min-[400px]:gap-2 sm:gap-3 md:max-w-2xl">
          {AGENCY.stats.map((stat, i) => {
            const Icon = STAT_ICONS[i] ?? Sparkles;
            return (
              <div
                key={stat.label}
                className="rounded-lg bg-white/10 px-1.5 py-2 text-center ring-1 ring-white/15 min-[400px]:rounded-xl min-[400px]:px-2 sm:px-3 sm:py-3"
              >
                <Icon className="mx-auto mb-0.5 size-3.5 text-amber-300 min-[400px]:mb-1 min-[400px]:size-4 sm:size-5" />
                <div className="text-[10px] font-bold leading-tight text-white min-[400px]:text-xs sm:text-sm md:text-base">
                  {stat.value}
                </div>
                <div className="mt-0.5 text-[9px] leading-tight text-white/70 min-[400px]:text-[10px] sm:text-xs">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        <ul className="shrink-0 space-y-1 sm:space-y-1.5 md:max-w-xl">
          {AGENCY.highlights.map((line) => (
            <li
              key={line}
              className="flex items-start gap-1.5 text-xs leading-snug text-white/85 min-[400px]:gap-2 min-[400px]:text-sm md:text-base"
            >
              <MapPin
                className="mt-0.5 size-3.5 shrink-0 text-emerald-400 min-[400px]:size-4"
                aria-hidden
              />
              {line}
            </li>
          ))}
        </ul>

        <div
          className={cn(
            "flex flex-col items-center gap-4 pt-1",
            "sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:pt-2",
            "lg:gap-8"
          )}
        >
          <div
            className={cn(
              "order-2 flex w-full flex-col",
              "text-center sm:order-1 sm:max-w-md sm:text-left"
            )}
          >
            <p className="text-base font-bold leading-snug text-amber-300 min-[400px]:text-lg sm:text-xl md:text-2xl">
              {AGENCY.cta}
            </p>
            <p className="mt-1 text-xs text-white/80 min-[400px]:text-sm">
              {AGENCY.qrHint}
            </p>

            {AGENCY.phoneDisplay ? (
              <p
                className={cn(
                  "mt-2 inline-flex items-center justify-center gap-2",
                  "text-xl font-extrabold tracking-tight text-white",
                  "min-[400px]:mt-3 min-[400px]:text-2xl sm:justify-start sm:text-3xl"
                )}
              >
                <Phone
                  className="size-6 shrink-0 min-[400px]:size-7 sm:size-8"
                  aria-hidden
                />
                {AGENCY.phoneDisplay}
              </p>
            ) : (
              <p className="mt-2 text-xs text-white/70 min-[400px]:text-sm">
                Откройте сайт visitinno.ru — мы перезвоним
              </p>
            )}

            <p
              className={cn(
                "mt-3 inline-flex w-full items-center justify-center gap-2",
                "rounded-xl bg-amber-400 px-4 py-3 font-bold text-[#1a1040]",
                "shadow-lg shadow-amber-400/30 sm:w-auto"
              )}
            >
              <Globe className="size-5" aria-hidden />
              {AGENCY.websiteLabel}
            </p>
          </div>

          <div className="order-1 flex shrink-0 flex-col items-center sm:order-2">
            <div
              className={cn(
                "rounded-2xl bg-white p-2 shadow-2xl shadow-violet-900/50",
                "ring-4 ring-amber-400/80",
                "min-[400px]:rounded-3xl min-[400px]:p-2.5 sm:p-3 md:p-4"
              )}
            >
              <img
                src={qrPhoneSvg}
                alt="QR-код: позвонить или забронировать экскурсию"
                className={cn(
                  "h-auto w-[min(58vw,200px)]",
                  "min-[400px]:w-[min(52vw,220px)]",
                  "sm:w-[200px] md:w-[220px] lg:w-[240px]"
                )}
                width={696}
                height={696}
                decoding="async"
              />
            </div>
            <p
              className={cn(
                "mt-2 max-w-[min(58vw,200px)] text-center",
                "text-[10px] font-semibold leading-tight text-amber-200/90",
                "min-[400px]:max-w-[220px] min-[400px]:text-xs sm:text-sm"
              )}
            >
              Сканируйте — позвоните или забронируйте экскурсию
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-white/50 min-[400px]:text-xs sm:text-sm">
          Нажмите на экран для входа гида
        </p>
      </div>
    </KioskScreen>
  );
}
