import type { KioskId } from "../api/types";

const VALID: KioskId[] = ["Popova", "Lobachevsky", "robot"];

export function parseKioskId(value: string | null | undefined): KioskId | null {
  if (!value) return null;
  const normalized =
    value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  if (normalized === "Robot") return "robot";
  if (VALID.includes(normalized as KioskId)) return normalized as KioskId;
  if (value === "robot") return "robot";
  return null;
}

/** location=Popova из query (?location=Popova) */
export function getKioskIdFromSearch(search: string): KioskId | null {
  const params = new URLSearchParams(search);
  return parseKioskId(params.get("location"));
}

export function buildGuideAuthUrl(kioskId: KioskId, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/guide/auth?location=${encodeURIComponent(kioskId)}`;
}

export function buildKioskHomeUrl(kioskId: KioskId, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/?location=${encodeURIComponent(kioskId)}`;
}
