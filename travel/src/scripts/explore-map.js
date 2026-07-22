/* Explore map: every covered city as a pin — tap one to open its profile. */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const el = document.getElementById('explore-map');
if (el) {
  const dests = JSON.parse(document.getElementById('explore-map-data').textContent);
  const map = L.map('explore-map', { zoomControl: true, scrollWheelZoom: false });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  const bounds = [];
  dests.forEach((d) => {
    if (d.lat == null) return;
    const m = L.circleMarker([d.lat, d.lng], { radius: 9, color: '#fff', weight: 2, fillColor: '#F97362', fillOpacity: 1 }).addTo(map);
    const img = d.image_url ? `<img src="${d.image_url}" alt="" style="width:180px;height:90px;object-fit:cover;border-radius:8px;display:block;margin-bottom:6px;">` : '';
    m.bindPopup(`${img}<b>${d.name}</b><br>${d.country}<br><a href="/explore/${d.id}?m=${d.month}">Open 12-month profile →</a>`);
    bounds.push([d.lat, d.lng]);
  });
  if (bounds.length) map.fitBounds(bounds, { padding: [30, 30] });
}
