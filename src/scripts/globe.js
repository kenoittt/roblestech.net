/*
 * RTC "Our Philosophy" — interactive 3D globe.
 * Philippines (Manila) linked by animated great-circle arcs to US / UK / Middle East / APAC.
 * Drag to rotate, hover a city marker for its label, auto-rotates when idle.
 * Adapted from the design handoff for this Astro codebase (npm `three`;
 * self-hosted texture; auto-init removed — the page calls initGlobe()).
 *
 * Transparent canvas — the section's navy gradient shows through.
 */
import * as THREE from 'three';

export function initGlobe(canvas, tipEls) {
  const tip = tipEls?.tip || document.getElementById('globe-tip');
  const tipName = tipEls?.name || document.getElementById('tip-name');
  const tipRegion = tipEls?.region || document.getElementById('tip-region');

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 8); // close enough to fill the column; still clears the arc apexes

  const R = 2;
  const globe = new THREE.Group();
  globe.rotation.x = 0.32;
  globe.rotation.y = -1.9; // start facing the Philippines / Asia
  scene.add(globe);

  // earth sphere (unlit map so it always reads; cool navy tint keeps it on-brand)
  const earthMat = new THREE.MeshBasicMaterial({ color: 0x2a4a8f });
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R, 64, 64), earthMat));
  const loader = new THREE.TextureLoader();
  loader.load('/assets/earth-blue-marble.jpg', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    earthMat.map = tex;
    earthMat.color = new THREE.Color(0x8ea6d4); // cool tint — set 0xffffff for full-color earth
    earthMat.needsUpdate = true;
  });

  // atmosphere rim glow
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.08, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x3992ff, transparent: true, opacity: 0.14, side: THREE.BackSide, blending: THREE.AdditiveBlending })
  ));

  // graticule (faint lat/long grid)
  const gmat = new THREE.LineBasicMaterial({ color: 0x9fc6ff, transparent: true, opacity: 0.1 });
  const seg = 64;
  for (let k = -60; k <= 60; k += 30) {
    const lat = k * Math.PI / 180, r = R * Math.cos(lat), y = R * Math.sin(lat), pts = [];
    for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)); }
    globe.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), gmat));
  }
  for (let k = 0; k < 360; k += 30) {
    const lng = k * Math.PI / 180, pts = [];
    for (let i = 0; i <= seg; i++) { const a = -Math.PI / 2 + (i / seg) * Math.PI; pts.push(new THREE.Vector3(Math.cos(a) * Math.cos(lng) * R, Math.sin(a) * R, Math.cos(a) * Math.sin(lng) * R)); }
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gmat));
  }

  const llToVec = (lat, lng, rad) => {
    const phi = (90 - lat) * Math.PI / 180, theta = (lng + 180) * Math.PI / 180;
    return new THREE.Vector3(-rad * Math.sin(phi) * Math.cos(theta), rad * Math.cos(phi), rad * Math.sin(phi) * Math.sin(theta));
  };

  const HUB = { name: 'Manila, Philippines', region: 'Delivery HQ', lat: 14.6, lng: 120.98 };
  const dests = [
    { name: 'New York, USA', region: 'North America', lat: 40.71, lng: -74.0 },
    { name: 'San Francisco, USA', region: 'North America', lat: 37.77, lng: -122.42 },
    { name: 'Toronto, Canada', region: 'North America', lat: 43.65, lng: -79.38 },
    { name: 'London, UK', region: 'Europe', lat: 51.5, lng: -0.13 },
    { name: 'Dubai, UAE', region: 'Middle East', lat: 25.2, lng: 55.27 },
    { name: 'Singapore', region: 'APAC', lat: 1.35, lng: 103.82 },
    { name: 'Tokyo, Japan', region: 'APAC', lat: 35.68, lng: 139.65 },
    { name: 'Sydney, Australia', region: 'APAC', lat: -33.87, lng: 151.21 }
  ];

  const markerMeshes = [];
  const addMarker = (c, hub) => {
    const v = llToVec(c.lat, c.lng, R + 0.02);
    const m = new THREE.Mesh(new THREE.SphereGeometry(hub ? 0.09 : 0.05, 20, 20), new THREE.MeshBasicMaterial({ color: hub ? 0xaee37b : 0x9fd0ff }));
    m.position.copy(v); m.userData = c; globe.add(m); markerMeshes.push(m);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(hub ? 0.17 : 0.11, 20, 20), new THREE.MeshBasicMaterial({ color: hub ? 0xaee37b : 0x3992ff, transparent: true, opacity: 0.22 }));
    halo.position.copy(v); globe.add(halo);
    return v;
  };
  const hubVec = addMarker(HUB, true);

  const slerp = (a, b, t) => {
    const an = a.clone().normalize(), bn = b.clone().normalize();
    const om = Math.acos(Math.max(-1, Math.min(1, an.dot(bn))));
    if (om < 1e-4) return an.clone();
    const s = Math.sin(om);
    return an.multiplyScalar(Math.sin((1 - t) * om) / s).add(bn.multiplyScalar(Math.sin(t * om) / s));
  };
  const arcs = [];
  dests.forEach((c, idx) => {
    const dv = addMarker(c, false);
    const steps = 60, pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push(slerp(hubVec, dv, t).multiplyScalar(R * (1 + 0.5 * Math.sin(Math.PI * t))));
    }
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x5fb0ff, transparent: true, opacity: 0.4 })));
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 14), new THREE.MeshBasicMaterial({ color: 0xaee37b }));
    dot.position.copy(pts[0]);
    globe.add(dot);
    arcs.push({ pts, dot, phase: idx / dests.length });
  });

  // interaction
  const rayc = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let dragging = false, lastX = 0, lastY = 0, velX = 0.0016;
  const rect = () => canvas.getBoundingClientRect();

  const onDown = (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.style.cursor = 'grabbing'; canvas.setPointerCapture(e.pointerId); };
  const onUp = (e) => { dragging = false; canvas.style.cursor = 'grab'; try { canvas.releasePointerCapture(e.pointerId); } catch (err) {} };
  const onLeave = () => { if (tip) tip.style.opacity = '0'; };
  const onMove = (e) => {
    const r = rect();
    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      globe.rotation.y += dx * 0.006;
      globe.rotation.x = Math.max(-0.9, Math.min(0.9, globe.rotation.x + dy * 0.006));
      velX = dx * 0.006; lastX = e.clientX; lastY = e.clientY; if (tip) tip.style.opacity = '0';
      return;
    }
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    rayc.setFromCamera(ndc, camera);
    const hits = rayc.intersectObjects(markerMeshes, false);
    if (hits.length && tip) {
      const c = hits[0].object.userData;
      if (tipName) tipName.textContent = c.name;
      if (tipRegion) tipRegion.textContent = c.region;
      const sp = hits[0].object.getWorldPosition(new THREE.Vector3()).project(camera);
      tip.style.left = ((sp.x * 0.5 + 0.5) * r.width) + 'px';
      tip.style.top = ((-sp.y * 0.5 + 0.5) * r.height) + 'px';
      tip.style.opacity = '1'; canvas.style.cursor = 'pointer';
    } else if (tip) { tip.style.opacity = '0'; canvas.style.cursor = 'grab'; }
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointermove', onMove);

  const resize = () => {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);
  // The canvas can be laid out (or revealed) after init — keep the buffer and
  // aspect locked to the real box so the globe never renders into a stale size.
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const clock = new THREE.Clock();
  let alive = true;
  const loop = () => {
    if (!alive) return;
    const t = clock.getElapsedTime(); // advances the clock — pulse dots travel toward each hub
    if (!dragging) { globe.rotation.y += velX; velX += (0.0016 - velX) * 0.02; }
    arcs.forEach(a => {
      const u = (t * 0.22 + a.phase) % 1;
      a.dot.position.copy(a.pts[Math.min(a.pts.length - 1, Math.floor(u * (a.pts.length - 1)))]);
    });
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  return () => { // teardown
    alive = false;
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointerleave', onLeave);
    canvas.removeEventListener('pointermove', onMove);
    window.removeEventListener('resize', resize);
    ro.disconnect();
    renderer.dispose();
  };
}
