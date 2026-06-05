export type GuideAgencyId = "traveltech" | "umatour" | "innotravel";

export type GuideAgencyOption = {
  id: GuideAgencyId;
  label: string;
};

export const GUIDE_AGENCIES: GuideAgencyOption[] = [
  { id: "traveltech", label: "Технологии путешествий" },
  { id: "umatour", label: "Уматур" },
  { id: "innotravel", label: "Иннотрэвел" },
];

export const DEFAULT_GUIDE_AGENCY: GuideAgencyId = "traveltech";

export function getGuideAgencyLabel(id: GuideAgencyId): string {
  return GUIDE_AGENCIES.find((item) => item.id === id)?.label ?? id;
}
