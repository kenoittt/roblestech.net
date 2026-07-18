// Shared client-side interactivity for every page.
// Each block is guarded so it no-ops on pages that don't use that feature.
// Astro bundles this and injects it once per page (see BaseLayout.astro).

// --- Sticky nav shadow on scroll ---
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () =>
    nav.classList.toggle('scrolled', window.scrollY > 20)
  );
}

// --- Mobile burger menu ---
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobile-menu');
if (burger && mobileMenu) {
  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  });
  mobileMenu.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      burger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

// --- Desktop "Learn" dropdown ---
document.querySelectorAll('.nav-learn').forEach((el) => {
  el.querySelector('.nav-learn-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    el.classList.toggle('open');
  });
});
document.addEventListener('click', () => {
  document.querySelectorAll('.nav-learn.open').forEach((el) => el.classList.remove('open'));
});

// --- Mobile "Learn" submenu ---
document.querySelectorAll('.mob-learn').forEach((el) => {
  el.querySelector('.mob-learn-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    el.classList.toggle('open');
  });
});

// --- FAQ accordion (faqs page) ---
document.querySelectorAll('.faq-q').forEach((q) => {
  q.addEventListener('click', () => {
    const item = q.parentElement;
    if (!item) return;
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach((i) => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

// --- FAQ sidebar scroll-spy (faqs page) ---
const faqSections = document.querySelectorAll('.faq-section[id]');
if (faqSections.length) {
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          document.querySelectorAll('.faq-nav a').forEach((a) => a.classList.remove('active'));
          document
            .querySelector(`.faq-nav a[href="#${entry.target.id}"]`)
            ?.classList.add('active');
        }
      });
    },
    { rootMargin: '-20% 0px -70% 0px' }
  );
  faqSections.forEach((s) => spy.observe(s));
}

// --- Scroll-reveal animations (.rv -> .on) ---
const revObs = new IntersectionObserver(
  (entries) => entries.forEach((x) => x.isIntersecting && x.target.classList.add('on')),
  { threshold: 0.1 }
);
document.querySelectorAll('.rv').forEach((el) => revObs.observe(el));

/* ---------- Services carousel ---------- */
(function () {
  const track = document.getElementById('svc-track');
  if (!track) return;
  const prev = document.getElementById('svc-prev');
  const next = document.getElementById('svc-next');
  const bar = document.getElementById('svc-progress-bar');

  const step = () => {
    const card = track.querySelector('.svc-card');
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '20') || 20;
    return card ? card.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
  };
  const maxScroll = () => track.scrollWidth - track.clientWidth;

  function update() {
    const max = maxScroll();
    const ratio = max > 0 ? track.scrollLeft / max : 0;
    if (bar) {
      const visible = Math.min(1, track.clientWidth / track.scrollWidth);
      bar.style.width = Math.max(12, visible * 100) + '%';
      bar.style.marginLeft = ratio * (100 - Math.max(12, visible * 100)) + '%';
    }
    if (prev) prev.disabled = track.scrollLeft <= 2;
    if (next) next.disabled = track.scrollLeft >= max - 2;
  }

  prev && prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next && next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  track.addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);

  // Drag / swipe to scroll (pointer events cover mouse + touch + pen).
  let down = false, startX = 0, startScroll = 0, moved = 0;
  track.addEventListener('pointerdown', (e) => {
    down = true; moved = 0;
    startX = e.clientX; startScroll = track.scrollLeft;
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) { track.classList.add('dragging'); moved = dx; }
    track.scrollLeft = startScroll - dx;
  });
  const end = () => { down = false; track.classList.remove('dragging'); };
  track.addEventListener('pointerup', end);
  track.addEventListener('pointercancel', end);
  // Prevent a drag from also triggering a click on the card link/button.
  track.addEventListener('click', (e) => { if (Math.abs(moved) > 5) { e.preventDefault(); e.stopPropagation(); } }, true);

  // Arrow keys when the carousel is focused.
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { track.scrollBy({ left: step(), behavior: 'smooth' }); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { track.scrollBy({ left: -step(), behavior: 'smooth' }); e.preventDefault(); }
  });

  update();
})();

