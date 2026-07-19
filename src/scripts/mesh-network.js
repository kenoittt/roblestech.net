/*
 * RTC "Our Philosophy" — animated glass mesh-network (moving lines + reflective circles).
 * Adapted from the design handoff for this Astro codebase (import from the npm `three`
 * package; auto-init removed — the page initializes it with a reduced-motion guard).
 *
 * Transparent canvas — the section's navy background shows through. Nodes are glassy
 * (reflective, clearcoat, transmission); the network drifts slowly and parallaxes
 * toward the cursor. Returns a teardown function.
 */
import * as THREE from 'three';

export function initMeshNetwork(canvas) {
  const pointer = { x: 0, y: 0 };
  const onMove = (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onMove);

  // Scroll reactivity: how far the mesh section has travelled through the
  // viewport, normalized to roughly [-1, 1] (0 ≈ centered on screen).
  let scrollN = 0;
  const onScroll = () => {
    const r = canvas.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    scrollN = Math.max(-1, Math.min(1, (vh / 2 - (r.top + r.height / 2)) / (vh / 2 + r.height / 2)));
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 0, 13);

  // lights (needed for the glass material)
  scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x04102e, 1.5));
  const l1 = new THREE.PointLight(0x9fc6ff, 90, 60); l1.position.set(8, 8, 12); scene.add(l1);
  const l2 = new THREE.PointLight(0x5864ff, 60, 60); l2.position.set(-9, -5, 8); scene.add(l2);
  const l3 = new THREE.PointLight(0xaee37b, 30, 60); l3.position.set(0, -8, 10); scene.add(l3);

  const group = new THREE.Group();
  scene.add(group);

  const N = 46;
  const nodes = [];
  const positions = [];
  const sphereGeo = new THREE.IcosahedronGeometry(0.16, 3); // hi-res so glass reads smooth
  const palette = [0x3992ff, 0x5864ff, 0x0464dd]; // RTC sky / indigo / action blue
  for (let i = 0; i < N; i++) {
    const p = new THREE.Vector3(
      (Math.random() - 0.5) * 11,
      (Math.random() - 0.5) * 11,
      (Math.random() - 0.5) * 6
    );
    const accent = Math.random() < 0.16; // ~1 in 6 nodes is the lime accent
    const m = new THREE.Mesh(sphereGeo, new THREE.MeshPhysicalMaterial({
      color: accent ? 0xaee37b : palette[i % 3],
      metalness: 0.15, roughness: 0.04,
      clearcoat: 1, clearcoatRoughness: 0.06,
      transmission: 0.55, ior: 1.45, thickness: 0.5,
      transparent: true, opacity: 0.92,
      emissive: accent ? 0x2c4a12 : 0x0a1c44, emissiveIntensity: 0.5
    }));
    m.position.copy(p);
    m.scale.setScalar(accent ? 1.9 : 1.1 + Math.random());
    group.add(m);
    nodes.push({ mesh: m, base: p.clone(), phase: Math.random() * Math.PI * 2 });
    positions.push(p);
  }

  // connect nearby nodes with lines
  const linePts = [];
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      if (positions[i].distanceTo(positions[j]) < 4.2) {
        linePts.push(positions[i].x, positions[i].y, positions[i].z);
        linePts.push(positions[j].x, positions[j].y, positions[j].z);
      }
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePts, 3));
  group.add(new THREE.LineSegments(lineGeo,
    new THREE.LineBasicMaterial({ color: 0x3992ff, transparent: true, opacity: 0.4 })));

  const resize = () => {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let alive = true;
  let scrollEased = 0, scrollTarget = 0;
  const loop = () => {
    if (!alive) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    group.rotation.y += dt * 0.03; // slow ambient spin
    // Scroll adds a subtle extra spin + slight tilt as the section moves past (kept gentle).
    scrollTarget = scrollN;
    scrollEased += (scrollTarget - scrollEased) * 0.035;
    group.rotation.y += scrollEased * 0.18;
    group.rotation.x = Math.sin(clock.elapsedTime * 0.15) * 0.06 + scrollEased * 0.05;
    nodes.forEach(n => { n.mesh.position.y = n.base.y + Math.sin(clock.elapsedTime * 0.6 + n.phase) * 0.25; });
    camera.position.x += (pointer.x * 1.8 - camera.position.x) * 0.05;
    camera.position.y += (-pointer.y * 1.2 - camera.position.y) * 0.05;
    // Scroll gently pushes the camera in/out for a parallax depth cue.
    camera.position.z += (13 - scrollEased * 0.8 - camera.position.z) * 0.05;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // Call to tear down.
  return () => {
    alive = false;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', resize);
    renderer.dispose();
  };
}
