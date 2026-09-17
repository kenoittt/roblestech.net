// Motion layer — WebGL fluid hero, custom cursor, magnetic buttons,
// headline line-reveal, scroll-velocity marquee.
// Every block is guarded: it no-ops on pages without its markup, on coarse
// pointers (touch), and when the user prefers reduced motion.

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------- Loading screen ---------- */
(function () {
  const loader = document.getElementById('loader');
  if (!loader) return;
  let seen = false;
  try { seen = !!sessionStorage.getItem('rtc-loaded'); } catch (e) {}
  if (seen) {
    loader.classList.add('gone'); // already shown this session
    return;
  }
  const MIN = reduce ? 300 : 1400; // let the animation play at least this long
  const started = performance.now();
  function dismiss() {
    const wait = Math.max(0, MIN - (performance.now() - started));
    setTimeout(() => {
      loader.classList.add('done');
      try { sessionStorage.setItem('rtc-loaded', '1'); } catch (e) {}
      loader.addEventListener('transitionend', () => loader.classList.add('gone'), { once: true });
      setTimeout(() => loader.classList.add('gone'), 900); // fallback
    }, wait);
  }
  if (document.readyState === 'complete') dismiss();
  else addEventListener('load', dismiss);
})();

/* ---------- Headline line reveal ---------- */
// .anim is added by JS so text stays visible without JS (crawlers/no-JS).
document.querySelectorAll('.reveal-lines').forEach((el) => {
  if (reduce) return;
  el.classList.add('anim');
  requestAnimationFrame(() => setTimeout(() => el.classList.add('in'), 80));
});

/* The WebGL fluid hero background used to live here — roughly 60 lines of
   GLSL and GL plumbing driving <canvas id="hero-fluid">, which every page
   downloaded because this script is site-wide. The homepage hero now uses the
   ColorBends island instead, so the canvas and this code are both gone. */

/* ---------- Custom cursor ---------- */
if (finePointer && !reduce) {
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (dot && ring) {
    let mx = 0, my = 0, rx = 0, ry = 0, revealed = false;
    addEventListener('pointermove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
      if (!revealed) {
        // Reveal the custom cursor only once it has a real position.
        revealed = true;
        rx = mx; ry = my;
        document.body.classList.add('has-cursor');
      }
    });
    (function loop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll('a, button, .svc-card').forEach((el) => {
      el.addEventListener('pointerenter', () => ring.classList.add('grow'));
      el.addEventListener('pointerleave', () => ring.classList.remove('grow'));
    });
  }
}

/* Magnetic buttons: removed. Every .btn used to chase the pointer with an
   inline transform on pointermove, which read as the button shaking under the
   cursor. The buttons now do one thing on hover — the gradient sweep — and
   that lives entirely in CSS. */

/* ---------- Card pointer tilt + follow-glow ---------- */
if (finePointer && !reduce) {
  const MAX = 7; // max tilt degrees
  document.querySelectorAll('.svc-card.tilt').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;   // 0..1
      const py = (e.clientY - r.top) / r.height;   // 0..1
      const rx = (0.5 - py) * MAX * 2;             // rotateX
      const ry = (px - 0.5) * MAX * 2;             // rotateY
      card.style.transform = `perspective(760px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px)`;
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });
}

/* ---------- Scroll-velocity marquee ---------- */
// The strip drifts on its own; scrolling adds speed in the scroll direction.
const track = document.querySelector('.marquee-track');
if (track && !reduce) {
  let offset = 0;
  let vel = 0;
  let lastY = window.scrollY;
  addEventListener('scroll', () => {
    vel += (window.scrollY - lastY) * 0.06;
    lastY = window.scrollY;
  }, { passive: true });
  (function loop() {
    vel *= 0.92;                       // friction
    offset -= 0.5 + vel;               // base drift + scroll boost
    const half = track.scrollWidth / 2;
    if (half > 0) {
      offset = ((offset % half) + half) % half * -1; // wrap seamlessly
    }
    track.style.transform = `translateX(${offset}px)`;
    requestAnimationFrame(loop);
  })();
}
