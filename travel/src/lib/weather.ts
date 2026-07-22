/*
 * Open-Meteo (free, keyless) weather sources:
 *  - monthClimate(): last full year's daily archive for a month -> averages
 *    (avg high/low, rain days, humidity) for the Destination Explorer.
 *  - todayForecast(): current-day forecast for the Today view.
 */

export type MonthClimate = {
  avg_high: number; avg_low: number; rain_days: number;
  humidity: number; precip_mm: number;
};

export async function monthClimate(lat: number, lng: number, month: number): Promise<MonthClimate | null> {
  const year = new Date().getUTCFullYear() - 1; // last completed year
  const mm = String(month).padStart(2, '0');
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
    `&start_date=${year}-${mm}-01&end_date=${year}-${mm}-${last}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean&timezone=auto`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const j: any = await res.json();
    const d = j.daily;
    if (!d?.temperature_2m_max?.length) return null;
    const avg = (a: number[]) => a.reduce((s, v) => s + (v ?? 0), 0) / a.length;
    return {
      avg_high: Math.round(avg(d.temperature_2m_max) * 10) / 10,
      avg_low: Math.round(avg(d.temperature_2m_min) * 10) / 10,
      rain_days: d.precipitation_sum.filter((v: number) => (v ?? 0) >= 1).length,
      humidity: Math.round(avg(d.relative_humidity_2m_mean)),
      precip_mm: Math.round(d.precipitation_sum.reduce((s: number, v: number) => s + (v ?? 0), 0)),
    };
  } catch { return null; }
}

export async function todayForecast(lat: number, lng: number) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&forecast_days=1&timezone=auto`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const j: any = await res.json();
    const d = j.daily;
    return {
      high: d?.temperature_2m_max?.[0], low: d?.temperature_2m_min?.[0],
      rain_prob: d?.precipitation_probability_max?.[0] ?? null, code: d?.weather_code?.[0] ?? null,
    };
  } catch { return null; }
}

export const weatherLabel = (code: number | null) => {
  if (code == null) return '';
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snowy';
  if (code <= 82) return 'Showers';
  return 'Stormy';
};
