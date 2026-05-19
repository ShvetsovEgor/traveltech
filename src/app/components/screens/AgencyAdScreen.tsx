import { ArrowRight, Award, Globe, Phone } from "lucide-react";
import { Chip, Typography, cn } from "@heroui/react";
import { AGENCY, getInteractivesHighlight } from "../../config/agency";
import { KioskScreen } from "../kiosk";
import qrPhoneSvg from "../../../../qr_phone.svg?url";

type AgencyAdScreenProps = {
  onScreenTap: () => void;
};

export function AgencyAdScreen({ onScreenTap }: AgencyAdScreenProps) {
  return (
    <KioskScreen
      className="relative cursor-pointer overflow-hidden bg-[#0c0824]"
      contentClassName={cn(
        "relative mx-auto flex w-full min-h-0 max-w-5xl flex-col justify-center",
        "!p-4 sm:!p-6 md:!p-8"
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

      <div className="relative z-10 flex w-full flex-col items-center gap-4 pointer-events-none sm:gap-5 md:gap-6">
        <header className="w-full shrink-0 text-center sm:text-left">
          <Chip className="mb-2 bg-amber-400/20 text-amber-100 sm:mb-3">
            <Chip.Label className="text-xs font-semibold uppercase tracking-wide sm:text-sm">
              {AGENCY.name}
            </Chip.Label>
          </Chip>
          <Typography.Heading
            level={1}
            className="text-2xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl"
          >
            {AGENCY.headline}
          </Typography.Heading>
          <p className="mt-2 flex items-start justify-center gap-2 text-left text-xs leading-snug text-amber-100/95 sm:mt-3 sm:justify-start sm:text-sm md:text-base">
            <Award
              className="mt-0.5 size-4 shrink-0 text-amber-300 sm:size-5"
              aria-hidden
            />
            {AGENCY.award}
          </p>
        </header>

        {/* Мобилка: 2×2, без карточек */}
        <div className="grid w-full max-w-md shrink-0 grid-cols-2 gap-x-3 gap-y-3 sm:max-w-lg md:hidden">
          <p className="text-center text-xs font-semibold leading-snug text-white sm:text-sm">
            {getInteractivesHighlight()}
          </p>
          <p className="text-center text-xs font-semibold leading-snug text-white sm:text-sm">
            {AGENCY.guidesHighlight}
          </p>
          {AGENCY.stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-base font-bold leading-tight text-white sm:text-lg">
                {stat.value}
              </p>
              <p className="mt-0.5 text-[10px] leading-tight text-white/75 sm:text-xs">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Десктоп: один ряд — интерактивы, гиды, 150 000+, 3 года */}
        <div className="hidden w-full shrink-0 items-start justify-between gap-4 md:flex lg:gap-8">
          <p className="max-w-[14rem] flex-1 text-center text-sm font-semibold leading-snug text-white lg:text-base">
            {getInteractivesHighlight()}
          </p>
          <p className="max-w-[11rem] flex-1 text-center text-sm font-semibold leading-snug text-white lg:text-base">
            {AGENCY.guidesHighlight}
          </p>
          {AGENCY.stats.map((stat) => (
            <div key={stat.label} className="flex-1 text-center">
              <p className="text-xl font-bold leading-tight text-white lg:text-2xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs leading-tight text-white/75 lg:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div
          className={cn(
            "flex w-full max-w-3xl flex-row items-center justify-center gap-3",
            "sm:gap-5 md:gap-8"
          )}
        >
          <p
            className={cn(
              "min-w-0 flex-1 text-right text-base font-bold leading-snug text-amber-300",
              "min-[400px]:text-lg sm:max-w-[11rem] sm:text-xl md:max-w-[14rem] md:text-2xl"
            )}
          >
            {AGENCY.immerseCta}
          </p>

          <ArrowRight
            className="size-10 shrink-0 text-amber-400 sm:size-14 md:size-16"
            strokeWidth={2.5}
            aria-hidden
          />

          <div className="flex shrink-0">
            <div
              className={cn(
                "rounded-2xl bg-white p-2 shadow-2xl shadow-violet-900/50",
                "ring-4 ring-amber-400/80",
                "min-[400px]:rounded-3xl min-[400px]:p-2.5 sm:p-3"
              )}
            >
              <img
                src={qrPhoneSvg}
                alt=""
                className="h-auto w-[min(52vw,200px)] sm:w-[200px] md:w-[220px]"
                width={696}
                height={696}
                decoding="async"
              />
            </div>
          </div>
        </div>

        {(AGENCY.phoneDisplay || AGENCY.websiteLabel) && (
          <div className="flex flex-col items-center gap-3 sm:items-start">
            {AGENCY.phoneDisplay ? (
              <p className="inline-flex items-center gap-2 text-2xl font-extrabold text-white sm:text-3xl">
                <Phone className="size-7 shrink-0 sm:size-8" aria-hidden />
                {AGENCY.phoneDisplay}
              </p>
            ) : null}
            <p
              className={cn(
                "inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5",
                "text-sm font-bold text-[#1a1040] shadow-lg shadow-amber-400/30 sm:text-base"
              )}
            >
              <Globe className="size-5" aria-hidden />
              {AGENCY.websiteLabel}
            </p>
          </div>
        )}
      </div>
    </KioskScreen>
  );
}
