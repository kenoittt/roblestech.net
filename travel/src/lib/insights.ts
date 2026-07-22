/*
 * Destination-month insight synthesis (SRS §5.2): cache table first; on miss,
 * fetch weather normals + ask Claude for the narrative profile as structured
 * JSON; validate, store with model version, serve from cache thereafter
 * (FR-AI-01/04/05, FR-DEX-09).
 */
import { createSupabaseAdmin } from './supabase';
import { monthClimate } from './weather';
import { claudeJSON, aiConfigured, AI_MODEL } from './claude';

export type Destination = { id: string; name: string; country: string; lat: number; lng: number };
export type MonthProfile = {
  weather_json: any; attire_json: any; crowd_index: string | null;
  festivals_json: any[]; hidden_gems_json: any[]; best_time_json: any;
  ai_model_version: string | null; refreshed_at: string;
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export async function getMonthProfile(dest: Destination, month: number): Promise<MonthProfile | null> {
  const admin = createSupabaseAdmin();
  const { data: cached } = await admin.from('destination_month_profiles')
    .select('*').eq('destination_id', dest.id).eq('month', month).single();
  if (cached) return cached as MonthProfile;

  // Cache miss: build it.
  const climate = await monthClimate(dest.lat, dest.lng, month);
  const weather_json: any = climate ?? {};

  let attire: any = {}, crowd: string | null = null, festivals: any[] = [], gems: any[] = [], best: any = {};
  if (aiConfigured()) {
    const ai = await claudeJSON<any>(
      'You are a meticulous travel intelligence writer. Be factual and month-specific; label anything uncertain as approximate. Never invent festival dates.',
      `Destination: ${dest.name}, ${dest.country}. Month: ${MONTHS[month - 1]}.
Climate data (last year's ${MONTHS[month - 1]} averages): ${JSON.stringify(climate)}.
Return JSON with exactly these keys:
{
 "climate_summary": "one sentence: how the month feels (hot/humid/dry/cold/wet)",
 "attire": {"summary": "one sentence", "items": ["4-6 packing items"]},
 "crowd_index": "peak" | "shoulder" | "off-season",
 "crowd_note": "one sentence: touristy vs local feel this month",
 "festivals": [{"name": "", "timing": "approximate timing within the month", "note": ""}],  // 0-4 real ones only
 "top_places": [{"name": "", "why": "one clause"}],   // 4-6
 "hidden_gems": [{"name": "", "why": "one clause"}],  // 3-5 genuinely lesser-known
 "best_time": {"verdict": "is THIS month a good time? one sentence", "best_months": ["Month", "Month"], "reason": "weather/crowds/price/events reasoning, one sentence"}
}`
    );
    if (ai) {
      weather_json.climate_summary = ai.climate_summary ?? '';
      attire = ai.attire ?? {};
      crowd = ['peak', 'shoulder', 'off-season'].includes(ai.crowd_index) ? ai.crowd_index : null;
      if (ai.crowd_note) weather_json.crowd_note = ai.crowd_note;
      festivals = Array.isArray(ai.festivals) ? ai.festivals.slice(0, 4) : [];
      gems = Array.isArray(ai.hidden_gems) ? ai.hidden_gems.slice(0, 5) : [];
      best = ai.best_time ?? {};
      best.top_places = Array.isArray(ai.top_places) ? ai.top_places.slice(0, 6) : [];
    }
  }

  const row = {
    destination_id: dest.id, month,
    weather_json, attire_json: attire, crowd_index: crowd,
    festivals_json: festivals, hidden_gems_json: gems, best_time_json: best,
    ai_model_version: aiConfigured() ? AI_MODEL : null,
    refreshed_at: new Date().toISOString(),
  };
  // Store even AI-less profiles (weather only); they refresh once a key exists.
  if (climate || aiConfigured()) {
    await admin.from('destination_month_profiles').upsert(row, { onConflict: 'destination_id,month' });
  }
  return row as unknown as MonthProfile;
}
