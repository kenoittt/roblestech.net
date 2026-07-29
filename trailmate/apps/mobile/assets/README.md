# Placeholder assets

Solid-colour PNGs in the brand forest green (`#0F2E1E`), generated so the Expo config
resolves and a build succeeds. They are **not** shippable artwork.

Replace before the first store submission (see `docs/ROADMAP.md`, Phase 3):

| File | Required size | Notes |
|---|---|---|
| `icon.png` | 1024×1024 | No transparency, no rounded corners — Apple applies the mask |
| `adaptive-icon.png` | 1024×1024 | Android foreground layer; keep art inside the centre 66% safe zone |
| `splash.png` | 1284×2778 | Centred logo on a solid background, `resizeMode: contain` |
| `notification-icon.png` | 96×96 | Android only. Must be a white silhouette on transparency |
| `favicon.png` | 48×48 | Web build only |
