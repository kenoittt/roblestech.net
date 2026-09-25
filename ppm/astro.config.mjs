// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

// Internal PPM app — server-rendered, session-checked per request.
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  /* @astrojs/react is pinned to v4 on purpose: it is the last major built
     against Vite 6, which is what Astro 5 ships. v7 depends on Vite 8 and
     installs its own copy, so @vitejs/plugin-react registers on a Vite
     instance this build never uses. The JSX then falls through to the default
     classic transform — React.createElement with no React import — and the nav
     throws "React is not defined" during SSR on every signed-in page. */
  integrations: [react()],
  /* No image service.
   *
   * PPM uses plain <img> and never astro:assets, but Astro still wires its
   * default sharp-backed service into the manifest, which is imported on every
   * request. That made a native module the app does not use a hard dependency
   * of every page render.
   *
   * It broke when Vercel's npm stopped running install scripts by default:
   *   npm warn install-scripts ... sharp@0.34.5 (install: node install/check.js)
   * sharp without its postinstall has no native binary, so importing it throws
   * and every route returns FUNCTION_INVOCATION_FAILED. The noop service keeps
   * sharp out of the bundle entirely, which is both the fix and the honest
   * description of what this app needs from image processing. */
  image: { service: { entrypoint: 'astro/assets/services/noop' } },
  site: 'https://ppm.roblestech.net',
  security: {
    // Same reason as the portal: Astro's origin check misfires behind Vercel's
    // proxy. Session cookies are httpOnly + SameSite=Lax, so CSRF is covered.
    checkOrigin: false,
  },
});
