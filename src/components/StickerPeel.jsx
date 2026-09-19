import { useRef, useEffect, useMemo } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import './StickerPeel.css';

/*
 * StickerPeel — from React Bits (reactbits.dev), JavaScript + CSS variant.
 *
 * Kept as close to the published source as possible. Three changes were needed
 * to make it work safely here:
 *
 *   1. InertiaPlugin is registered as well as Draggable. The source registers
 *      only Draggable but passes `inertia: true`, which Draggable ignores with
 *      a console warning unless the plugin is registered. GSAP 3.13+ ships
 *      InertiaPlugin in the free package, so this just turns on the throw
 *      behaviour the source already asked for.
 *
 *   2. The drag bounds no longer come from `target.parentNode`. Astro wraps
 *      every island in <astro-island>, which it styles `display: contents` —
 *      an element that generates no box, so its getBoundingClientRect is not a
 *      usable bounding area and Draggable would confine the sticker to nothing.
 *      boundsFor() walks up to the nearest ancestor that actually generates a
 *      box, which is the real section either way. Passing bounds="page" instead
 *      confines it to the whole document.
 *
 *      "page" computes explicit min/max numbers rather than handing Draggable
 *      document.body. Given the body element, Draggable resolved the bounds
 *      against the sticker's offsetParent and clamped it to translateY(-6909)
 *      on init — it teleported to the top of the document the moment it
 *      hydrated. The numbers below are measured from the document directly and
 *      are subtracted from the element's untranslated origin, so recomputing
 *      them mid-drag does not shift anything.
 *
 *   3. Its two unprefixed class names, .draggable and .flap, are now
 *      .sticker-draggable and .sticker-flap. Vite bundles this stylesheet into
 *      the shared services chunk, so those names were being defined on all six
 *      service pages plus the hub — none of which render a sticker. Nothing
 *      collides with them today, but .svc-card and .svc-cat did exactly this
 *      to these same pages earlier, and a name that generic sitting in a
 *      shared chunk is a collision waiting to happen. Everything else the
 *      component defines was already prefixed "sticker-".
 *
 *   4. The `avoid` prop keeps the sticker clear of the floating nav.
 *
 *      This is not a z-order problem and adding z-index does not fix it. The
 *      sticker already paints behind the nav, which was verified by hit-testing
 *      the overlap. The nav is glass — rgba(245,246,250,.55) over a blur — so
 *      whatever is behind it shows through, and a sticker passing under it
 *      reads as sitting on top of it.
 *
 *      topInset does not cover this either. It clamps the sticker's DOCUMENT
 *      position, but the nav is fixed to the VIEWPORT, so any element in the
 *      document passes through the nav's band on the way up the page no matter
 *      where it is parked.
 *
 *      The fix is to CLIP the sticker at the nav's bottom edge, not to hide it.
 *      Clipped, it reads exactly as it should: sliding under an opaque header,
 *      the way page content does everywhere else. Fading it out instead made it
 *      vanish on approach, which is not the same thing and looked broken.
 *
 *      The clip is a horizontal line, which only works because the static tilt
 *      lives on .sticker-image rather than out here. This element is
 *      un-rotated at rest, so a local inset() and a screen-space line are the
 *      same line. GSAP does rotate this element during a drag, so the clip is
 *      dropped for the duration of one, otherwise the cut would go diagonal
 *      under the cursor. The negative insets on the other three sides matter
 *      too: clip-path clips to the border box, and the tilted artwork overhangs
 *      it, so a plain inset(Npx 0 0 0) would shave the corners off.
 *
 *      On release it is still nudged clear of the nav, so it cannot come to
 *      rest with half of itself permanently clipped away.
 */

gsap.registerPlugin(Draggable, InertiaPlugin);

/* Nearest ancestor that generates a box — skips display:contents wrappers. */
const boundsFor = (el) => {
  let p = el.parentElement;
  while (p && getComputedStyle(p).display === 'contents') p = p.parentElement;
  return p || el.parentElement;
};

/* Keep the element inside the document, measured in document coordinates.
 *
 * Draggable's own `bounds` is not used for this. Two forms were tried against
 * the real page and neither landed where its documentation implies: passing
 * document.body pinned the sticker to translateY(-6909) on init, and passing
 * {top,left,width,height} in the offsetParent's space clamped a consistent
 * 462px lower than asked — recomputing on press did not change it, so it was
 * not a layout-timing problem but a coordinate space I could not pin down.
 *
 * Clamping here instead costs a getBoundingClientRect per drag frame and every
 * number in it can be checked: the element's document position against the
 * document's own scroll size. topInset holds a strip at the top out of reach so
 * the sticker cannot be parked under the floating nav and show through its
 * glass; it still scrolls past the nav like any other page content.
 */
const clampToPage = (el, topInset = 0) => {
  const r = el.getBoundingClientRect();
  const doc = document.documentElement;
  const top = r.top + window.scrollY;
  const left = r.left + window.scrollX;
  const maxTop = Math.max(topInset, doc.scrollHeight - r.height);
  const maxLeft = Math.max(0, doc.scrollWidth - r.width);

  let dy = 0;
  if (top < topInset) dy = topInset - top;
  else if (top > maxTop) dy = maxTop - top;

  let dx = 0;
  if (left < 0) dx = -left;
  else if (left > maxLeft) dx = maxLeft - left;

  if (dx || dy) {
    gsap.set(el, {
      x: (Number(gsap.getProperty(el, 'x')) || 0) + dx,
      y: (Number(gsap.getProperty(el, 'y')) || 0) + dy
    });
  }
};

/* How far the sticker's top sits above the bottom edge of the element it is
 * meant to avoid, in viewport pixels. 0 when they do not overlap. Both rects
 * are viewport rects, which is the space a fixed nav actually lives in. */
const overlapWith = (el, selector) => {
  if (!selector) return 0;
  const avoidEl = document.querySelector(selector);
  if (!avoidEl) return 0;
  const r = el.getBoundingClientRect();
  const n = avoidEl.getBoundingClientRect();
  if (r.right <= n.left || r.left >= n.right) return 0;
  if (r.top >= n.bottom || r.bottom <= n.top) return 0;
  return n.bottom - r.top;
};

const StickerPeel = ({
  imageSrc,
  rotate = 30,
  peelBackHoverPct = 30,
  peelBackActivePct = 40,
  peelEasing = 'power3.out',
  peelHoverEasing = 'power2.out',
  width = 200,
  shadowIntensity = 0.6,
  lightingIntensity = 0.1,
  initialPosition = 'center',
  peelDirection = 0,
  bounds = '',
  topInset = 0,
  avoid = '',
  className = ''
}) => {
  const containerRef = useRef(null);
  const dragTargetRef = useRef(null);
  const pointLightRef = useRef(null);
  const pointLightFlippedRef = useRef(null);
  const draggableInstanceRef = useRef(null);
  const draggingRef = useRef(false);

  const defaultPadding = 10;

  useEffect(() => {
    const target = dragTargetRef.current;
    if (!target) return;

    let startX = 0,
      startY = 0;

    if (initialPosition === 'center') {
      return;
    }

    if (typeof initialPosition === 'object' && initialPosition.x !== undefined && initialPosition.y !== undefined) {
      startX = initialPosition.x;
      startY = initialPosition.y;
    }

    gsap.set(target, { x: startX, y: startY });
  }, [initialPosition]);

  useEffect(() => {
    const target = dragTargetRef.current;
    const usePage = bounds === 'page';

    draggableInstanceRef.current = Draggable.create(target, {
      type: 'x,y',
      bounds: usePage ? undefined : boundsFor(target),
      inertia: true,
      onPress() {
        draggingRef.current = true;
        /* A clip line drawn for an un-rotated box would skew as soon as the
           drag rotates this element, so it comes off for the duration. */
        target.style.clipPath = '';
      },
      onDrag() {
        if (usePage) clampToPage(target, topInset);
        const rot = gsap.utils.clamp(-24, 24, this.deltaX * 0.4);
        gsap.to(target, { rotation: rot, duration: 0.15, ease: 'power1.out' });
      },
      onThrowUpdate() {
        if (usePage) clampToPage(target, topInset);
      },
      onDragEnd() {
        const rotationEase = 'power2.out';
        const duration = 0.8;
        gsap.to(target, { rotation: 0, duration, ease: rotationEase });
      },
      /* Fires after the throw settles too, which is the moment that decides
         where the sticker comes to rest. */
      onRelease() {
        draggingRef.current = false;
        nudgeClear();
      },
      onThrowComplete() {
        draggingRef.current = false;
        nudgeClear();
      }
    })[0];

    /* Push the sticker down until its top clears the nav, so it cannot be
       parked behind the glass. Runs on release rather than during the drag. */
    const nudgeClear = () => {
      const over = overlapWith(target, avoid);
      if (over <= 0) return;
      gsap.to(target, {
        y: (Number(gsap.getProperty(target, 'y')) || 0) + over + 12,
        duration: 0.32,
        ease: 'power2.out',
        onComplete: () => { if (usePage) clampToPage(target, topInset); syncAvoid(); }
      });
    };

    /* While scrolling, keep the cut line on the nav's bottom edge. -60px on the
       other three sides leaves the tilted artwork's overhang alone; clip-path
       otherwise clips to the border box and would crop the corners. */
    const syncAvoid = () => {
      if (!avoid || draggingRef.current) return;
      const over = overlapWith(target, avoid);
      target.style.clipPath = over > 0 ? `inset(${over}px -60px -60px -60px)` : '';
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; syncAvoid(); });
    };
    if (avoid) {
      window.addEventListener('scroll', onScroll, { passive: true });
      syncAvoid();
    }

    /* Re-measure on resize. The published version clamped x and y to >= 0,
       which assumes the bounds start at the element's own origin; with page
       bounds the minimums are negative, so that clamp would yank the sticker
       back toward the band on any resize. Handing Draggable fresh bounds lets
       it do the clamping correctly in both modes. */
    const handleResize = () => {
      const d = draggableInstanceRef.current;
      if (!d) return;
      if (usePage) clampToPage(target, topInset);
      else d.update(true);
      syncAvoid();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('scroll', onScroll);
      if (draggableInstanceRef.current) {
        draggableInstanceRef.current.kill();
      }
    };
  }, [bounds, topInset, avoid]);

  useEffect(() => {
    const updateLight = e => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      gsap.set(pointLightRef.current, { attr: { x, y } });

      const normalizedAngle = Math.abs(peelDirection % 360);
      if (normalizedAngle !== 180) {
        gsap.set(pointLightFlippedRef.current, { attr: { x, y: rect.height - y } });
      } else {
        gsap.set(pointLightFlippedRef.current, { attr: { x: -1000, y: -1000 } });
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', updateLight);
      return () => container.removeEventListener('mousemove', updateLight);
    }
  }, [peelDirection]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = () => {
      container.classList.add('touch-active');
    };

    const handleTouchEnd = () => {
      container.classList.remove('touch-active');
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  const cssVars = useMemo(
    () => ({
      '--sticker-rotate': `${rotate}deg`,
      '--sticker-p': `${defaultPadding}px`,
      '--sticker-peelback-hover': `${peelBackHoverPct}%`,
      '--sticker-peelback-active': `${peelBackActivePct}%`,
      '--sticker-peel-easing': peelEasing,
      '--sticker-peel-hover-easing': peelHoverEasing,
      '--sticker-width': `${width}px`,
      '--sticker-shadow-opacity': shadowIntensity,
      '--sticker-lighting-constant': lightingIntensity,
      '--peel-direction': `${peelDirection}deg`
    }),
    [
      rotate,
      peelBackHoverPct,
      peelBackActivePct,
      peelEasing,
      peelHoverEasing,
      width,
      shadowIntensity,
      lightingIntensity,
      peelDirection
    ]
  );

  return (
    <div className={`sticker-draggable ${className}`} ref={dragTargetRef} style={cssVars}>
      <svg width="0" height="0">
        <defs>
          <filter id="pointLight">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feSpecularLighting
              result="spec"
              in="blur"
              specularExponent="100"
              specularConstant={lightingIntensity}
              lightingColor="white"
            >
              <fePointLight ref={pointLightRef} x="100" y="100" z="300" />
            </feSpecularLighting>
            <feComposite in="spec" in2="SourceGraphic" result="lit" />
            <feComposite in="lit" in2="SourceAlpha" operator="in" />
          </filter>

          <filter id="pointLightFlipped">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feSpecularLighting
              result="spec"
              in="blur"
              specularExponent="100"
              specularConstant={lightingIntensity * 7}
              lightingColor="white"
            >
              <fePointLight ref={pointLightFlippedRef} x="100" y="100" z="300" />
            </feSpecularLighting>
            <feComposite in="spec" in2="SourceGraphic" result="lit" />
            <feComposite in="lit" in2="SourceAlpha" operator="in" />
          </filter>

          <filter id="dropShadow">
            <feDropShadow
              dx="2"
              dy="4"
              stdDeviation={3 * shadowIntensity}
              floodColor="black"
              floodOpacity={shadowIntensity}
            />
          </filter>

          <filter id="expandAndFill">
            <feOffset dx="0" dy="0" in="SourceAlpha" result="shape" />
            <feFlood floodColor="rgb(179,179,179)" result="flood" />
            <feComposite operator="in" in="flood" in2="shape" />
          </filter>
        </defs>
      </svg>

      <div className="sticker-container" ref={containerRef}>
        <div className="sticker-main">
          <div className="sticker-lighting">
            <img
              src={imageSrc}
              alt=""
              className="sticker-image"
              draggable="false"
              onContextMenu={e => e.preventDefault()}
            />
          </div>
        </div>

        <div className="sticker-flap">
          <div className="sticker-flap-lighting">
            <img
              src={imageSrc}
              alt=""
              className="sticker-flap-image"
              draggable="false"
              onContextMenu={e => e.preventDefault()}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickerPeel;
