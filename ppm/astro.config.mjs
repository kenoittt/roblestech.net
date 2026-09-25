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
   * That is a live hazard now that Vercel's npm skips install scripts:
   *   npm warn install-scripts ... sharp@0.34.5 (install: node install/check.js)
   * sharp without its postinstall has no native binary, so importing it throws
   * and the function fails to boot. It was not what caused the outage this was
   * found during — that was gsap, below — but it is a dependency on a native
   * module the app never asks for. The noop service keeps sharp out of the
   * bundle entirely, which is both the fix and the honest description of what
   * this app needs from image processing. */
  image: { service: { entrypoint: 'astro/assets/services/noop' } },

  /* gsap is bundled into the server build instead of imported at runtime.
   *
   * gsap's package.json has no "type": "module", but its index.js is written
   * in ESM. Node decides a .js file's format from that field, so it loads the
   * file as CommonJS, finds no named exports in it, and throws:
   *
   *   SyntaxError: Named export 'gsap' not found. The requested module 'gsap'
   *   is a CommonJS module, which may not support all module.exports as named
   *   exports.
   *
   * Node 22.7 and later sniff the syntax and load it as ESM anyway, which is
   * why this never reproduced in development — it depends entirely on the Node
   * version the function happens to run on. Left external, the nav imports gsap
   * at the top of the layout chunk, so on a runtime without that sniffing every
   * page that renders the nav — which is every page — returned a 500.
   *
   * Bundling it removes the question: Vite inlines the ESM source at build time
   * and Node never resolves the package at all. */
  vite: { ssr: { noExternal: ['gsap'] } },
  site: 'https://ppm.roblestech.net',
  security: {
    // Same reason as the portal: Astro's origin check misfires behind Vercel's
    // proxy. Session cookies are httpOnly + SameSite=Lax, so CSRF is covered.
    checkOrigin: false,
  },
});
