/*
 * Trip map island (FR-MAP-01..04): Leaflet + OpenStreetMap tiles.
 * Pins: lodging (teal), itinerary items colored by day, wishlist places (grey).
 * Add places by searching (server-proxied geocoder) or tapping the map.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const data = JSON.parse(document.getElementById('map-data').textContent);
const { tripId, lodgings, items, places } = data;

const map = L.map('map', { zoomControl: true });
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const DAY_COLORS = ['#F97362', '#0F766E', '#F5B54A', '#7C6BD6', '#2E86AB', '#C0567A', '#5B8C5A', '#B0623B'];
const bounds = [];
const dayIndex = new Map();
let dayN = 0;
const colorForDay = (d) => {
  if (!d) return '#9AA7A4';
  if (!dayIndex.has(d)) dayIndex.set(d, DAY_COLORS[dayN++ % DAY_COLORS.length]);
  return dayIndex.get(d);
};

const pin = (lat, lng, color, html) => {
  const m = L.circleMarker([lat, lng], { radius: 9, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 }).addTo(map);
  m.bindPopup(html);
  bounds.push([lat, lng]);
  return m;
};

lodgings.forEach((g) => {
  if (g.lat == null) return;
  pin(g.lat, g.lng, '#0F766E', `<b>🏨 ${g.name}</b><br>${g.address ?? ''}<br><a href="/trips/${tripId}">Edit in details</a>`);
});

// group same-day stops and draw the day's route (FR-MAP-03)
const byDay = {};
items.forEach((it) => {
  if (it.lat == null) return;
  const c = colorForDay(it.day);
  pin(it.lat, it.lng, c, `<b>${it.place_name}</b><br>${it.day ?? 'unscheduled'} ${it.time ?? ''}<br>${it.notes ?? ''}<br><a href="/trips/${tripId}/itinerary">Edit in itinerary</a>`);
  if (it.day) (byDay[it.day] ??= []).push(it);
});
// Distance between consecutive stops (haversine, km) → route plausibility.
const kmBetween = (a, b) => {
  const R = 6371, dLat = ((b[0] - a[0]) * Math.PI) / 180, dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};
const routeSummary = document.getElementById('route-summary');
Object.entries(byDay).forEach(([d, list]) => {
  const sorted = list.sort((a, b) => String(a.time ?? '').localeCompare(String(b.time ?? '')));
  const pts = sorted.map((i) => [i.lat, i.lng]);
  if (pts.length > 1) L.polyline(pts, { color: colorForDay(d), weight: 3, opacity: 0.6, dashArray: '6 6' }).addTo(map);
  if (routeSummary && pts.length > 1) {
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += kmBetween(pts[i - 1], pts[i]);
    const verdict = total <= 12 ? '✅ easy day (walk/short rides)'
      : total <= 60 ? '🚕 doable with transit or taxis'
      : '⚠️ very long day — consider splitting or reordering';
    const row = document.createElement('div');
    row.className = 'hint';
    row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:6px;';
    row.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:${colorForDay(d)};flex:0 0 auto;"></span>` +
      `<span><b>${new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</b>` +
      ` — ${sorted.length} stops · ~${total.toFixed(1)} km between stops · ${verdict}</span>`;
    routeSummary.appendChild(row);
  }
});

places.forEach((p) => {
  if (p.lat == null) return;
  pin(p.lat, p.lng, p.status === 'scheduled' ? '#F5B54A' : '#9AA7A4',
    `<b>📍 ${p.place_name}</b><br>${p.status === 'wishlist' ? 'Places to visit' : 'Scheduled'}<br><a href="/trips/${tripId}/itinerary">Manage</a>`);
});

if (bounds.length) map.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 });
else map.setView([22.3193, 114.1694], 4);

// ── Add place: tap the map ────────────────────────────────────────────────
map.on('click', async (e) => {
  const name = prompt('Add this spot to Places to Visit — name it:');
  if (!name) return;
  await fetch('/api/place-save', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ op: 'add', trip_id: tripId, place_name: name, lat: e.latlng.lat, lng: e.latlng.lng }),
  });
  location.reload();
});

// ── Add place: search (only when the page provides the search bar) ───────
const q = document.getElementById('map-q');
const results = document.getElementById('map-results');
const searchForm = document.getElementById('map-search');
if (searchForm) searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  results.innerHTML = '<span class="hint">Searching…</span>';
  const res = await fetch('/api/geocode?q=' + encodeURIComponent(q.value));
  const j = await res.json();
  results.innerHTML = '';
  (j.results ?? []).forEach((r) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mini'; b.style.margin = '4px 6px 0 0';
    b.textContent = '+ ' + r.display_name.slice(0, 70);
    b.addEventListener('click', async () => {
      await fetch('/api/place-save', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ op: 'add', trip_id: tripId, place_name: r.display_name.split(',')[0], lat: r.lat, lng: r.lng }),
      });
      location.reload();
    });
    results.appendChild(b);
  });
  if (!(j.results ?? []).length) results.innerHTML = '<span class="hint">No matches.</span>';
});
