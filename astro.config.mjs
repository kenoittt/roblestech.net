// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Static site for GitHub Pages (custom domain roblestech.net via public/CNAME).
// build.format: 'file' emits flat files (contact.html, faqs.html, ...) at the
// site root — matching the current layout so extensionless links like
// href="/contact" resolve exactly as they do today.
//
// The React integration is here for components that genuinely need client-side
// state. It costs nothing until a .jsx/.tsx component is actually rendered with
// a client:* directive — an island with no directive is server-rendered to HTML
// and ships no runtime. Anything presentational should still be a .astro file.
export default defineConfig({
  site: 'https://roblestech.net',
  build: {
    format: 'file',
  },
  integrations: [react()],
});
