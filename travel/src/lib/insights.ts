/*
 * Destination-month insight synthesis (SRS §5.2), zero runtime cost:
 * live Open-Meteo climate numbers + curated knowledge packs (dest-content.ts)
 * + attire derived from the climate by rules. Cached per destination+month in
 * destination_month_profiles (FR-DEX-09); rows written by the old AI path
 * (ai_model_version null or non-curated) are rebuilt on first view.
 */
import { createSupabaseAdmin } from './supabase';
import { monthClimate, type MonthClimate } from './weather';
import { PACKS } from './dest-content';

export type Destination = { id: string; name: string; country: string; lat: number; lng: number };
export type MonthProfile = {
  weather_json: any; attire_json: any; crowd_index: string | null;
  festivals_json: any[]; hidden_gems_json: any[]; best_time_json: any;
  ai_model_version: string | null; refreshed_at: string;
};

export const CONTENT_VERSION = 'curated-v1';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CROWD: Record<string, 'peak' | 'shoulder' | 'off-season'> = { p: 'peak', s: 'shoulder', o: 'off-season' };
const CROWD_NOTE: Record<string, string> = {
  peak: 'Expect full hotels and busy sights this month — book ahead and hit the big spots early.',
  shoulder: 'A comfortable in-between month: decent weather, thinner crowds, better prices.',
  'off-season': 'Quiet and local-feeling this month — the trade-off is usually the weather.',
};

/* Packing list from the actual numbers: temperature bands, rain, humidity. */
export function deriveAttire(c: MonthClimate | null) {
  if (!c) return {};
  const items: string[] = [];
  const feels: string[] = [];

  if (c.avg_high >= 33) { feels.push('very hot'); items.push('Light, breathable clothing (linen/cotton)', 'Sun hat & SPF 50 sunscreen', 'Refillable water bottle'); }
  else if (c.avg_high >= 27) { feels.push('hot'); items.push('Light summer clothing', 'Sunglasses & sunscreen'); }
  else if (c.avg_high >= 20) { feels.push('warm'); items.push('T-shirts plus a light layer for evenings'); }
  else if (c.avg_high >= 12) { feels.push('mild-to-cool'); items.push('Long sleeves and a medium jacket'); }
  else if (c.avg_high >= 3) { feels.push('cold'); items.push('Warm coat, sweater layers, gloves'); }
  else { feels.push('freezing'); items.push('Insulated winter coat, thermal layers, hat & gloves'); }

  if (c.avg_low <= 5 && c.avg_high >= 15) items.push('Warm layer for cold nights — big day/night swing');
  if (c.rain_days >= 12) { feels.push('very rainy'); items.push('Compact umbrella & rain jacket', 'Quick-dry footwear'); }
  else if (c.rain_days >= 6) { feels.push('showery'); items.push('Packable rain layer'); }
  if (c.humidity >= 80 && c.avg_high >= 25) { feels.push('humid'); items.push('Extra changes of light clothing'); }
  items.push('Comfortable walking shoes');

  return {
    summary: `Expect ${feels.join(', ')} conditions — days around ${Math.round(c.avg_high)}°C, nights near ${Math.round(c.avg_low)}°C, ~${c.rain_days} rainy day${c.rain_days === 1 ? '' : 's'}.`,
    items: [...new Set(items)].slice(0, 6),
  };
}

function buildProfile(dest: Destination, month: number, climate: MonthClimate | null): Omit<MonthProfile, 'refreshed_at'> & { destination_id: string; month: number; refreshed_at: string } {
  const pack = PACKS[dest.name];
  const weather_json: any = climate ? { ...climate } : {};
  let crowd: string | null = null;
  let festivals: any[] = [], gems: any[] = [], best: any = {};

  if (pack) {
    crowd = CROWD[pack.crowd[month - 1]] ?? null;
    if (crowd) weather_json.crowd_note = CROWD_NOTE[crowd];
    festivals = pack.festivals[month] ?? [];
    gems = pack.gems;
    const isBest = pack.best_months.includes(MONTHS[month - 1]);
    best = {
      verdict: isBest
        ? `${MONTHS[month - 1]} is one of the best months to visit ${dest.name}.`
        : `${MONTHS[month - 1]} works, but ${pack.best_months.slice(0, 2).join(' or ')} is the sweet spot for ${dest.name}.`,
      best_months: pack.best_months,
      reason: pack.best_reason,
      top_places: pack.top,
    };
  }

  return {
    destination_id: dest.id, month,
    weather_json, attire_json: deriveAttire(climate), crowd_index: crowd,
    festivals_json: festivals, hidden_gems_json: gems, best_time_json: best,
    ai_model_version: CONTENT_VERSION,
    refreshed_at: new Date().toISOString(),
  };
}

export async function getMonthProfile(dest: Destination, month: number): Promise<MonthProfile | null> {
  const admin = createSupabaseAdmin();
  const { data: cached } = await admin.from('destination_month_profiles')
    .select('*').eq('destination_id', dest.id).eq('month', month).single();
  if (cached && cached.ai_model_version === CONTENT_VERSION) return cached as MonthProfile;

  // Miss, or a stale row from the retired AI path: rebuild from curated packs.
  const climate = await monthClimate(dest.lat, dest.lng, month);
  const row = buildProfile(dest, month, climate);
  await admin.from('destination_month_profiles').upsert(row, { onConflict: 'destination_id,month' });
  return row as unknown as MonthProfile;
}
