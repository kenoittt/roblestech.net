// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// WanderWise — SSR on a dedicated Vercel project (SRS §5.1).
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  site: 'https://wanderwise.roblestech.net',
  security: {
    // Astro's origin check misfires behind Vercel's proxy (same as our other
    // apps). Sessions are httpOnly + SameSite=Lax cookies, covering CSRF.
    checkOrigin: false,
  },
});
