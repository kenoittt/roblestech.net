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
