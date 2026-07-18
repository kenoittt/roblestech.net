// @ts-check
import { defineConfig } from 'astro/config';

// Static site for GitHub Pages (custom domain roblestech.net via public/CNAME).
// build.format: 'file' emits flat files (contact.html, faqs.html, ...) at the
// site root — matching the current layout so extensionless links like
// href="/contact" resolve exactly as they do today.
export default defineConfig({
  site: 'https://roblestech.net',
  build: {
    format: 'file',
  },
});
