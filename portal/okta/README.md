# Okta custom sign-in page (RTC theme)

`sign-in-page.html` is the Okta hosted sign-in page (Security → Customizations →
Sign-in page → Code editor) restyled to match the client portal
(`portal/public/portal.css`) and roblestech.net.

## What was changed
Only presentation. All Handlebars variables (`{{themedStylesUrl}}`,
`{{faviconUrl}}`, `{{pageTitle}}`, `{{bgImageUrl}}`, `{{nonceValue}}`,
`{{#useSiwGen3}}`), the `{{{SignInWidgetResources}}}` / `{{{OktaUtil}}}` blocks
and the widget bootstrap script are untouched, so the login flow is unaffected.

- Deep-navy page background with the two brand radial washes (`#010b1f`,
  `#032c7c`, `#133984`); any theme background image is layered under it at 22%
  opacity so the palette stays on-brand.
- Widget rendered as a centered glass card (blur + hairline border + soft
  shadow), 424px max width, with the "Client Portal" lime eyebrow above it and
  the portal wordmark/copyright below.
- Montserrat body / League Spartan eyebrow, lime (`#aee37b`) primary button and
  links, dark glass inputs with the lime focus ring, and portal-matching
  error/success/warning alerts.
- Covers the multi-step Identity Engine screens too: authenticator and factor
  rows, "keep me signed in" checkbox, dividers, QR codes, selects, autofill
  repaint, reduced-motion and a mobile breakpoint.

## Notes
- Google Fonts are loaded from `fonts.googleapis.com` / `fonts.gstatic.com`. If
  the org's CSP blocks them, add both as Trusted Origins in Okta; every rule
  falls back to the system sans stack on its own.
- The org logo comes from the Okta theme (served by Okta, so it is CSP-safe).
  Upload `portal/public/logo-white.png` as the theme logo to match the portal.
- Selectors target Sign-In Widget Gen 2 class names plus the Gen 3
  (`.siw-main-view` / `.siw-main-body`) wrappers. Gen 3 also honours the colors
  set under Okta's theme settings — set primary color `#aee37b` there so any
  element not covered here still lands on brand.
