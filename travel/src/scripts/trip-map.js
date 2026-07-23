/*
 * Trip map island (FR-MAP-01..04): MapLibre GL + OpenFreeMap vector tiles —
 * free, no API key, English-preferring labels (see lib/mapStyle.ts).
 * Pins: lodging (teal), itinerary items colored by day, wishlist places
 * (grey). Add places by searching (autocomplete with photo thumbnails) or
 * tapping the map. Each day's route also links out to Google/Apple Maps.
 */
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { englishStyle } from '../lib/mapStyle';

(async function () {
  const el = document.getElementById('map');
  if (!el) return;
  const data = JSON.parse(document.getElementById('map-data').textContent);
  const { tripId, lodgings, items, places } = data;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const style = await englishStyle();
  const map = new maplibregl.Map({ container: 'map', style, center: [114.1694, 22.3193], zoom: 4 });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  const DAY_COLORS = ['#F97362', '#0F766E', '#F5B54A', '#7C6BD6', '#2E86AB', '#C0567A', '#5B8C5A', '#B0623B'];
  const dayIndex = new Map();
  let dayN = 0;
  const colorForDay = (d) => {
    if (!d) return '#9AA7A4';
    if (!dayIndex.has(d)) dayIndex.set(d, DAY_COLORS[dayN++ % DAY_COLORS.length]);
    return dayIndex.get(d);
  };

  const bounds = new maplibregl.LngLatBounds();
  const pin = (lng, lat, color, html) => {
    const dot = document.createElement('div');
    dot.style.cssText = `width:18px;height:18px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45);cursor:pointer;`;
    new maplibregl.Marker({ element: dot }).setLngLat([lng, lat])
      .setPopup(new maplibregl.Popup({ offset: 12, maxWidth: '240px' }).setHTML(html)).addTo(map);
    bounds.extend([lng, lat]);
  };

  map.on('load', () => {
    lodgings.forEach((g) => {
      if (g.lat == null) return;
      pin(g.lng, g.lat, '#0F766E', `<b>${esc(g.name)}</b><br>${esc(g.address ?? '')}<br><a href="/trips/${tripId}">Edit in details</a>`);
    });

    // group same-day stops and draw the day's route (FR-MAP-03)
    const byDay = {};
    items.forEach((it) => {
      if (it.lat == null) return;
      const c = colorForDay(it.day);
      pin(it.lng, it.lat, c, `<b>${esc(it.place_name)}</b><br>${esc(it.day ?? 'unscheduled')} ${esc(it.time ?? '')}<br>${esc(it.notes ?? '')}<br><a href="/trips/${tripId}/itinerary">Edit in itinerary</a>`);
      if (it.day) (byDay[it.day] ??= []).push(it);
    });

    // Distance between consecutive stops (haversine, km) → route plausibility.
    const kmBetween = (a, b) => {
      const R = 6371, dLat = ((b[0] - a[0]) * Math.PI) / 180, dLng = ((b[1] - a[1]) * Math.PI) / 180;
      const s = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(s));
    };
    const routeSummary = document.getElementById('route-summary');
    Object.entries(byDay).forEach(([d, list], idx) => {
      const sorted = list.sort((a, b) => String(a.time ?? '').localeCompare(String(b.time ?? '')));
      const pts = sorted.map((i) => [i.lat, i.lng]); // [lat,lng] for haversine + URL building
      const coords = pts.map((p) => [p[1], p[0]]); // [lng,lat] for MapLibre GeoJSON
      if (coords.length > 1) {
        const srcId = 'route-' + idx;
        map.addSource(srcId, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } } });
        map.addLayer({ id: srcId, type: 'line', source: srcId, paint: { 'line-color': colorForDay(d), 'line-width': 3, 'line-dasharray': [2, 2], 'line-opacity': 0.7 } });
      }
      if (routeSummary && pts.length > 1) {
        let total = 0;
        for (let i = 1; i < pts.length; i++) total += kmBetween(pts[i - 1], pts[i]);
        const verdict = total <= 12 ? 'easy day (walk / short rides)'
          : total <= 60 ? 'doable with transit or taxis'
          : 'very long day — consider splitting or reordering';
        // Google Maps supports true multi-stop directions; Apple Maps' URL
        // scheme only reliably takes a start + end, so intermediate stops
        // are skipped there (still useful for the overall day route).
        const gUrl = 'https://www.google.com/maps/dir/?api=1'
          + '&origin=' + pts[0].join(',') + '&destination=' + pts[pts.length - 1].join(',')
          + (pts.length > 2 ? '&waypoints=' + pts.slice(1, -1).map((p) => p.join(',')).join('|') : '');
        const aUrl = 'https://maps.apple.com/?saddr=' + pts[0].join(',') + '&daddr=' + pts[pts.length - 1].join(',');
        const row = document.createElement('div');
        row.className = 'hint';
        row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap;';
        row.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:${colorForDay(d)};flex:0 0 auto;"></span>` +
          `<span><b>${new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</b>` +
          ` — ${sorted.length} stops · ~${total.toFixed(1)} km between stops · ${verdict}</span>` +
          `<a class="mini" href="${gUrl}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>` +
          `<a class="mini" href="${aUrl}" target="_blank" rel="noopener noreferrer">Open in Apple Maps</a>`;
        routeSummary.appendChild(row);
      }
    });

    places.forEach((p) => {
      if (p.lat == null) return;
      pin(p.lng, p.lat, p.status === 'scheduled' ? '#F5B54A' : '#9AA7A4',
        `<b>${esc(p.place_name)}</b><br>${p.status === 'wishlist' ? 'Places to visit' : 'Scheduled'}<br><a href="/trips/${tripId}/itinerary">Manage</a>`);
    });

    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 48, maxZoom: 13 });
  });

  // ── Add place: tap the map ────────────────────────────────────────────────
  map.on('click', async (e) => {
    const name = prompt('Add this spot to Places to Visit — name it:');
    if (!name) return;
    await fetch('/api/place-save', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ op: 'add', trip_id: tripId, place_name: name, lat: e.lngLat.lat, lng: e.lngLat.lng }),
    });
    location.reload();
  });

  // ── Add place: live autocomplete with photo thumbnails ───────────────────
  const q = document.getElementById('map-q');
  const results = document.getElementById('map-results');
  const searchForm = document.getElementById('map-search');
  if (!q || !results) return;

  const addPlace = async (name, lat, lng) => {
    await fetch('/api/place-save', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ op: 'add', trip_id: tripId, place_name: name, lat, lng }),
    });
    location.reload();
  };

  const renderResults = (list) => {
    results.innerHTML = '';
    if (!list.length) { results.innerHTML = '<span class="hint">No matches.</span>'; return; }
    list.forEach((r) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'geo-result';
      const img = r.img
        ? `<img src="${r.img}" alt="" loading="lazy">`
        : `<span class="geo-ph"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Z"/><circle cx="12" cy="11" r="2.2"/></svg></span>`;
      row.innerHTML = `${img}<span class="geo-name">${esc(r.display_name)}</span>`;
      row.addEventListener('click', () => addPlace(r.display_name.split(',')[0], r.lat, r.lng));
      results.appendChild(row);
    });
  };

  let debounceTimer;
  const runSearch = async () => {
    const query = q.value.trim();
    if (query.length < 3) { results.innerHTML = ''; return; }
    results.innerHTML = '<span class="hint">Searching…</span>';
    try {
      const res = await fetch('/api/geocode?q=' + encodeURIComponent(query));
      const j = await res.json();
      renderResults(j.results ?? []);
    } catch { results.innerHTML = '<span class="hint">Could not search.</span>'; }
  };
  q.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(runSearch, 350); });
  if (searchForm) searchForm.addEventListener('submit', (e) => { e.preventDefault(); clearTimeout(debounceTimer); runSearch(); });
})();
