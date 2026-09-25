// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Internal PPM app — server-rendered, session-checked per request.
export default defineConfig({
  output: 'server',
  adapter: vercel(),
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

  /* Packages that must be bundled rather than left for Node to resolve.
   *
   * The problem these share: the package only loads if Node is new enough to
   * paper over how it was published, and the function runtime is not that new.
   * It cannot be seen in development, where the local Node papers over it.
   * gsap was here too until the nav stopped needing it.
   *
   *   sanitize-html — CommonJS, and it require()s htmlparser2, which is ESM.
   *   That is ERR_REQUIRE_ESM on any runtime without require(esm), which Node
   *   enabled by default only in 22.12.
   *
   * Bundling removes the question entirely: Vite inlines the source at build
   * time and Node never resolves the package. The QA pass keeps this list
   * honest by importing every remaining runtime dependency with both Node
   * features switched off. */
  vite: {
    ssr: {
      noExternal: [
        /* sanitize-html and everything it reaches for. Bundling the package
           alone is not enough: Vite rewrites its require() calls into imports
           and leaves the targets external, which turns ERR_REQUIRE_ESM into
           "does not provide an export named 'default'". The tree goes in
           together or not at all. */
        'sanitize-html',
        'htmlparser2',
        'is-plain-object',
      ],
    },
  },
  site: 'https://ppm.roblestech.net',
  security: {
    // Same reason as the portal: Astro's origin check misfires behind Vercel's
    // proxy. Session cookies are httpOnly + SameSite=Lax, so CSRF is covered.
    checkOrigin: false,
  },
});
