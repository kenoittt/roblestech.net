import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './CardNav.css';

/*
 * CardNav — from React Bits (reactbits.dev), JavaScript + CSS variant.
 *
 * Kept as close to the published source as possible. Three changes:
 *
 *   1. react-icons is not a dependency here, and the published source says to
 *      substitute your own icon if it is not available. GoArrowUpRight is an
 *      inline SVG with the same glyph.
 *
 *   2. Link items may carry `action` instead of `href`. Two of the three cards
 *      this nav renders end in things that are not destinations: switching the
 *      theme, and signing out. The source only emits anchors, so without this
 *      the theme control would have to be a fake link intercepted by href,
 *      which reads wrong to a screen reader and behaves wrong on a middle
 *      click. An item with `action` renders a <button>; everything else is
 *      unchanged and still renders an anchor.
 *
 *   3. An item may carry `account`, which renders the signed-in person's
 *      avatar, name and email above that card's links. Astro components cannot
 *      render inside a React island, so the layout hands over plain values and
 *      the card draws the block itself.
 *
 *   4. The CTA button's label and destination are props. The source hardcodes
 *      "Get Started", which is a marketing-site CTA; this nav is inside an
 *      authenticated tool where the useful always-visible action is different.
 *
 * Everything else, including the GSAP timeline, the mobile height measurement
 * and the resize handling, is the published implementation.
 */

const ArrowUpRight = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" width="1em" height="1em" fill="none"
       stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
       aria-hidden="true">
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);

const CardNav = ({
  logo,
  logoAlt = 'Logo',
  items,
  className = '',
  ease = 'power3.out',
  baseColor = '#fff',
  menuColor,
  buttonBgColor,
  buttonTextColor,
  ctaLabel = 'Get Started',
  ctaHref,
  onLinkAction,
}) => {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navRef = useRef(null);
  const cardsRef = useRef([]);
  const tlRef = useRef(null);

  const calculateHeight = () => {
    const navEl = navRef.current;
    if (!navEl) return 260;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
      const contentEl = navEl.querySelector('.card-nav-content');
      if (contentEl) {
        const wasVisible = contentEl.style.visibility;
        const wasPointerEvents = contentEl.style.pointerEvents;
        const wasPosition = contentEl.style.position;
        const wasHeight = contentEl.style.height;

        contentEl.style.visibility = 'visible';
        contentEl.style.pointerEvents = 'auto';
        contentEl.style.position = 'static';
        contentEl.style.height = 'auto';

        contentEl.offsetHeight;

        const topBar = 60;
        const padding = 16;
        const contentHeight = contentEl.scrollHeight;

        contentEl.style.visibility = wasVisible;
        contentEl.style.pointerEvents = wasPointerEvents;
        contentEl.style.position = wasPosition;
        contentEl.style.height = wasHeight;

        return topBar + contentHeight + padding;
      }
    }
    return 260;
  };

  const createTimeline = () => {
    const navEl = navRef.current;
    if (!navEl) return null;

    gsap.set(navEl, { height: 60, overflow: 'hidden' });
    gsap.set(cardsRef.current, { y: 50, opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    tl.to(navEl, {
      height: calculateHeight,
      duration: 0.4,
      ease
    });

    tl.to(cardsRef.current, { y: 0, opacity: 1, duration: 0.4, ease, stagger: 0.08 }, '-=0.1');

    return tl;
  };

  useLayoutEffect(() => {
    const tl = createTimeline();
    tlRef.current = tl;

    return () => {
      tl?.kill();
      tlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ease, items]);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!tlRef.current) return;

      if (isExpanded) {
        const newHeight = calculateHeight();
        gsap.set(navRef.current, { height: newHeight });

        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          newTl.progress(1);
          tlRef.current = newTl;
        }
      } else {
        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          tlRef.current = newTl;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  const toggleMenu = () => {
    const tl = tlRef.current;
    if (!tl) return;
    if (!isExpanded) {
      setIsHamburgerOpen(true);
      setIsExpanded(true);
      tl.play(0);
    } else {
      setIsHamburgerOpen(false);
      tl.eventCallback('onReverseComplete', () => setIsExpanded(false));
      tl.reverse();
    }
  };

  const setCardRef = i => el => {
    if (el) cardsRef.current[i] = el;
  };

  return (
    <div className={`card-nav-container ${className}`}>
      <nav ref={navRef} className={`card-nav ${isExpanded ? 'open' : ''}`} style={{ backgroundColor: baseColor }}>
        <div className="card-nav-top">
          <div
            className={`hamburger-menu ${isHamburgerOpen ? 'open' : ''}`}
            onClick={toggleMenu}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleMenu();
              }
            }}
            role="button"
            aria-label={isExpanded ? 'Close menu' : 'Open menu'}
            aria-expanded={isExpanded}
            tabIndex={0}
            style={{ color: menuColor || '#000' }}
          >
            <div className="hamburger-line" />
            <div className="hamburger-line" />
          </div>

          <div className="logo-container">
            <a href="/" className="logo-link">
              <img src={logo} alt={logoAlt} className="logo" />
            </a>
          </div>

          <a
            className="card-nav-cta-button"
            href={ctaHref}
            style={{ backgroundColor: buttonBgColor, color: buttonTextColor }}
          >
            {ctaLabel}
          </a>
        </div>

        <div className="card-nav-content" aria-hidden={!isExpanded}>
          {(items || []).slice(0, 3).map((item, idx) => (
            <div
              key={`${item.label}-${idx}`}
              className="nav-card"
              ref={setCardRef(idx)}
              style={{ backgroundColor: item.bgColor, color: item.textColor }}
            >
              <div className="nav-card-label">{item.label}</div>
              {item.account && (
                <div className="nav-card-who">
                  {item.account.src ? (
                    <img className="avatar" src={item.account.src} alt="" width={30} height={30}
                         style={{ width: 30, height: 30 }} />
                  ) : (
                    <span className="avatar avatar-i" aria-hidden="true"
                          style={{ width: 30, height: 30, background: item.account.tint, fontSize: 12 }}>
                      {item.account.initials}
                    </span>
                  )}
                  <span className="who-text">
                    <strong>{item.account.name}</strong>
                    <em>{item.account.email}</em>
                  </span>
                </div>
              )}
              <div className="nav-card-links">
                {item.links?.map((lnk, i) =>
                  lnk.action ? (
                    <button
                      key={`${lnk.label}-${i}`}
                      type="button"
                      className="nav-card-link nav-card-link-btn"
                      aria-label={lnk.ariaLabel}
                      onClick={() => onLinkAction && onLinkAction(lnk.action)}
                    >
                      <ArrowUpRight className="nav-card-link-icon" />
                      <span data-action-label={lnk.action}>{lnk.label}</span>
                    </button>
                  ) : (
                    <a key={`${lnk.label}-${i}`} className="nav-card-link" href={lnk.href} aria-label={lnk.ariaLabel}>
                      <ArrowUpRight className="nav-card-link-icon" />
                      {lnk.label}
                    </a>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default CardNav;
