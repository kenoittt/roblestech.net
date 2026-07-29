/**
 * Display formatting. Kept in one place so a price never renders two different ways.
 */

import { format, formatDistanceToNowStrict, isPast, isToday, isTomorrow } from "date-fns";
import type { CancellationPolicy, HikeDifficulty } from "@/types/database";

export function money(cents: number, currency = "usd"): string {
  if (cents === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function distance(km: number): string {
  return km >= 10 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
}

export function elevation(metres: number): string {
  return `${metres.toLocaleString("en-US")} m gain`;
}

export function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

export function startTime(iso: string, timeZone?: string): string {
  const date = new Date(iso);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);

  if (isToday(date)) return `Today, ${time}`;
  if (isTomorrow(date)) return `Tomorrow, ${time}`;
  return `${format(date, "EEE d MMM")}, ${time}`;
}

export function relativeStart(iso: string): string {
  const date = new Date(iso);
  return isPast(date)
    ? `${formatDistanceToNowStrict(date)} ago`
    : `in ${formatDistanceToNowStrict(date)}`;
}

export const difficultyLabel: Record<HikeDifficulty, string> = {
  easy: "Easy",
  moderate: "Moderate",
  hard: "Hard",
  expert: "Expert",
};

/** SDS §9.3 — the same wording the hiker sees before paying and when cancelling. */
export const policyLabel: Record<CancellationPolicy, string> = {
  flexible: "Flexible — full refund up to 24 hours before",
  moderate: "Moderate — full refund up to 72 hours before, 50% up to 24 hours",
  strict: "Strict — full refund up to 7 days before, 50% up to 72 hours",
};

export function spotsLeft(capacityMax: number, confirmedSpots: number): string {
  const left = Math.max(0, capacityMax - confirmedSpots);
  if (left === 0) return "Full";
  if (left === 1) return "1 spot left";
  if (left <= 3) return `${left} spots left`;
  return `${left} of ${capacityMax} spots`;
}
