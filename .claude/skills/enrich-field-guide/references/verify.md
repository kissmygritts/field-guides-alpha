# Verification notes

`build/verify.mjs` drives the **system** Chrome headless (no puppeteer/playwright
download). It injects a probe, loads the file over `file://`, and reads back
measurements from the page title.

## What it checks

- **No horizontal overflow:** `document.documentElement.scrollWidth === clientWidth`.
- **Zero JS errors:** `window.onerror` capture (empty = pass).
- **Fully offline:** it wraps `fetch`/`XHR` and counts calls — **any network request
  fails the build.** This is the automated guardrail for the no-hotlinks rule.

Exit code is non-zero if any file fails, so it's CI-safe.

## The 500px clamp (don't be fooled)

Headless Chrome enforces a **~500px minimum window width**. Ask for a 390px window and
it renders at 500; a screenshot taken at 390 then *looks* cropped on the right. **That
is an artifact, not overflow.** Trust `scrollWidth === clientWidth` (the probe reports
`500/500`), not the picture. This exact false alarm cost time before — the layout was
fine.

## Screenshots

`npm run verify -- --shot` writes PNGs to `build/.verify/`. Read one or two to confirm
layout and, importantly, that the **right images landed for each stop** — an
image/title desync (wrong hero photo) won't fail the automated checks but is obvious in
a screenshot. That's how a bristlecone stop showing a road instead of the gnarled tree
was caught.

For a full-page capture, the page can be very tall; measuring `scrollHeight` first
(the probe can be extended) and sizing the window to it avoids clipping. A wider window
(e.g. 1600px) yields a shorter page that's easier to capture whole.
