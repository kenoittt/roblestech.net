/* Explore map: every covered city as a pin — tap one to open its profile.
   MapLibre GL + OpenFreeMap (free, no key, English-preferring labels). */
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { englishStyle } from '../lib/mapStyle';

(async function () {
  const el = document.getElementById('explore-map');
  if (!el) return;
  const dests = JSON.parse(document.getElementById('explore-map-data').textContent);

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const style = await englishStyle();
  const map = new maplibregl.Map({ container: 'explore-map', style, center: [90, 20], zoom: 2.4, scrollZoom: false });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  map.on('load', () => {
    const bounds = new maplibregl.LngLatBounds();
    dests.forEach((d) => {
      if (d.lat == null) return;
      const dot = document.createElement('div');
      dot.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#F97362;border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45);cursor:pointer;';
      const img = d.image_url ? `<img src="${d.image_url}" alt="" style="width:180px;height:90px;object-fit:cover;border-radius:8px;display:block;margin-bottom:6px;">` : '';
      new maplibregl.Marker({ element: dot }).setLngLat([d.lng, d.lat])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(`${img}<b>${esc(d.name)}</b><br>${esc(d.country)}<br><a href="/explore/${encodeURIComponent(d.id)}?m=${d.month}">Open 12-month profile →</a>`))
        .addTo(map);
      bounds.extend([d.lng, d.lat]);
    });
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 40 });
  });
})();
