import type { APIRoute } from 'astro';
import templateHtml from '../templates/dashboard.html?raw';
import { DEMO_GSC, DEMO_CONFIG, DEMO_AUDITS } from '../lib/demo-data';

export const prerender = false;

/*
 * Prospect-facing sample dashboard.
 *
 * Deliberately public: a link you can drop in a proposal or open on a call
 * beats handing out shared credentials, and there is nothing here to protect —
 * every figure is invented for a company that does not exist.
 *
 * The flip side of inventing figures is that they must never be mistaken for a
 * client's real results, so this route makes the demo status impossible to miss
 * or scroll past: a fixed banner, a fictional client name carrying "(sample)",
 * and hero copy that says so outright. It also carries noindex so it cannot
 * surface in search as though it were a case study.
 */
export const GET: APIRoute = async () => {
  const payload = { gsc: DEMO_GSC, config: DEMO_CONFIG, audits: DEMO_AUDITS, theme: null };
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');

  const style = `<style>
    .rtc-demo{position:fixed;top:0;left:0;right:0;z-index:100000;
      display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;
      padding:9px 18px;background:#032c7c;color:#fff;
      font-family:'Montserrat',system-ui,-apple-system,sans-serif;
      font-size:.82rem;font-weight:600;text-align:center;
      box-shadow:0 2px 14px rgba(0,5,15,.35);}
    .rtc-demo b{font-weight:800;letter-spacing:.04em;text-transform:uppercase;font-size:.72rem;
      background:#aee37b;color:#0a0f1f;padding:3px 9px;border-radius:999px;}
    .rtc-demo a{color:#aee37b;font-weight:700;text-decoration:none;white-space:nowrap;}
    .rtc-demo a:hover{text-decoration:underline;}
    /* Keep the nav and hero clear of the banner. */
    .rtc-pnav{top:56px !important;}
    .hero{padding-top:150px !important;}
    @media(max-width:700px){
      .rtc-demo{font-size:.74rem;padding:8px 12px;gap:9px;}
      .rtc-pnav{top:74px !important;}
      .hero{padding-top:172px !important;}
    }
    /* Sample reports link nowhere — make that visible rather than a dead click. */
    #auditRows a, .audit-link{pointer-events:none;opacity:.55;}
  </style>`;

  const navStyle = `<style>
    .rtc-pnav{position:fixed;left:50%;transform:translateX(-50%);z-index:99999;
      display:flex;align-items:center;justify-content:space-between;gap:20px;
      width:calc(100% - 32px);max-width:1180px;height:60px;padding:0 20px;border-radius:16px;
      background:rgba(18,20,32,0.42);backdrop-filter:blur(22px) saturate(180%);
      -webkit-backdrop-filter:blur(22px) saturate(180%);
      border:1px solid rgba(255,255,255,0.20);box-shadow:0 10px 34px rgba(0,0,0,0.30);
      font-family:'Montserrat',system-ui,-apple-system,sans-serif;}
    .rtc-pnav .b{display:flex;align-items:center;gap:9px;font-weight:800;font-size:1rem;
      color:#fff;text-decoration:none;letter-spacing:-.01em;}
    .rtc-pnav .b img{height:28px;width:auto;display:block;}
    .rtc-pnav .b i{font-style:normal;color:#3992ff;}
    .rtc-pnav .cta{font-weight:700;font-size:.85rem;color:#0a0f1f;background:#aee37b;
      border:0;padding:8px 16px;border-radius:9px;text-decoration:none;}
    @media(max-width:560px){.rtc-pnav{width:calc(100% - 20px);height:54px;padding:0 14px;}
      .rtc-pnav .b i{display:none;} .rtc-pnav .b img{height:24px;}}
  </style>`;

  const inject =
    `<link rel="icon" type="image/png" href="/favicon.png">` +
    `<meta name="robots" content="noindex, nofollow">` +
    navStyle + style +
    `<script>window.__DASH__ = JSON.parse(${JSON.stringify(json)});</script>`;

  const banner =
    `<div class="rtc-demo" role="note">` +
    `<b>Sample</b>` +
    `<span>Demonstration dashboard for <strong>Northwind Supply Co.</strong>, a company that does not exist. Every figure is invented.</span>` +
    `<a href="https://roblestech.net/contact">Get this for your brand →</a>` +
    `</div>`;

  const navBar =
    `<nav class="rtc-pnav">` +
    `<a class="b" href="https://roblestech.net"><img src="/logo-white.png" alt="">Robles <i>Tech</i></a>` +
    `<a class="cta" href="https://roblestech.net/contact">Book a call</a>` +
    `</nav>`;

  const html = templateHtml
    .replace('</head>', `${inject}\n</head>`)
    .replace(/<body([^>]*)>/, `<body$1>\n${banner}\n${navBar}`);

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Public and stable — safe to cache briefly at the edge.
      'cache-control': 'public, max-age=300',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
};
