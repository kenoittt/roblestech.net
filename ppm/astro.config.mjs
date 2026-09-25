// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

// Internal PPM app — server-rendered, session-checked per request.
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [react()],
  site: 'https://ppm.roblestech.net',
  security: {
    // Same reason as the portal: Astro's origin check misfires behind Vercel's
    // proxy. Session cookies are httpOnly + SameSite=Lax, so CSRF is covered.
    checkOrigin: false,
  },
});
