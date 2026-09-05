import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatPrice(value: number, currency = "EUR"): string {
  if (currency !== "EUR") {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return eur.format(Math.round(value));
}

export function formatTemperature(value: number): string {
  return `${Math.round(value)}°C`;
}

/** 2.5 -> "2 h 30" */
export function formatDuration(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

export function formatDateRange(start?: string, end?: string): string {
  if (!start || !end) return "Dates flexibles";
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "Dates flexibles";
  return `${fmt.format(s)} – ${fmt.format(e)}`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count > 1 ? (plural ?? `${singular}s`) : singular}`;
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/** Interpolation linéaire décroissante : 1 quand value <= best, 0 quand value >= worst. */
export function lerpScore(value: number, best: number, worst: number): number {
  if (best === worst) return value <= best ? 1 : 0;
  return clamp((worst - value) / (worst - best), 0, 1);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string): number {
  const s = new Date(`${start}T12:00:00`).getTime();
  const e = new Date(`${end}T12:00:00`).getTime();
  return Math.max(0, Math.round((e - s) / 86400000));
}

export function daysFromNow(iso: string): number {
  const target = new Date(`${iso}T12:00:00`).getTime();
  const now = new Date().setHours(12, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}

/** Générateur pseudo-aléatoire déterministe (mêmes données à chaque rendu). */
export function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
