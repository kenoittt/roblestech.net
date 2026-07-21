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
});
