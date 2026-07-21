// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Server-rendered client portal. Every page is dynamic: sessions are checked
// per request in middleware, and each client's report is streamed only after
// server-side authorization. Deployed to Vercel (portal.roblestech.net).
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  site: 'https://portal.roblestech.net',
  security: {
    // Astro's default origin check compares the Origin header against the host,
    // but behind Vercel's proxy the forwarded host doesn't match, so it wrongly
    // rejects our own login/admin form posts ("Cross-site POST forms forbidden").
    // Supabase session cookies are httpOnly + SameSite=Lax, which already blocks
    // cross-site state-changing requests, so disabling this check is safe here.
    checkOrigin: false,
  },
});
