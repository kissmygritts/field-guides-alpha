# Field features — how they're driven

All the enrichment beyond photos is config- or content-driven and injected by
`assemble.mjs`. Where each thing lives:

## Per stop — GPS + elevation  (config)

`config.gps.<stop> = { lat, lng, label, elev }`. `assemble` injects a `.stop-geo` line
under the stop's `<h3>` with a `geo:` link (opens the phone's maps app offline) and the
elevation. An `alt` array adds secondary points on the same line — e.g. Owens carries
Cerro Gordo:

```json
"owens": { "lat": 36.4231, "lng": -117.9339, "label": "Owens dry lakebed", "elev": "3,600 ft",
  "alt": [{ "name": "Cerro Gordo", "lat": 36.5383, "lng": -117.8056, "elev": "8,200 ft" }] }
```

Elevation matters in the field (temperature, altitude) — always fill it in.

## Jump index  (config)

`config.days` groups stops for the tap-to-jump nav at the top:
`{ "label": "Day 1", "stops": [["<slug>", "<short label>"], …] }`. The links target the
`#s-<slug>` anchors `assemble` puts on each `<h3>`. Keep the grouping in trip order.

## Moon panel  (computed)

`config.moon = { start, end, windowLabel }` (ISO dates for the trip window) plus
`config.darkSites`. `build/lib/moon.mjs` computes illumination per day from a fixed
synodic-month reference — **deterministic, never hand-entered** — and buckets the window
into bright / transition / dark ranges, flags the new & full moon dates, and templates
three cards (the dark one highlighted as prime Milky Way). If the trip dates change, the
panel recomputes; don't edit dates by hand.

## Day briefs (fuel / signal / water / drive)  (content)

These are authored prose tied to a specific day, so they live in `content.html` as a
`<div class="day-brief">` after each day's `.day-legs`, with `<span>` chips
(`⛽ Fuel`, `📵 Signal`, `💧 Water`, `🏔 Altitude`, `🚗 Drive`). They're the single most
useful field addition — where to gas up, dead-signal zones, water/heat/altitude
warnings, drive distance/time. Write them per guide from real route knowledge.

## Credits  (generated)

`config.credits` is an ordered `[[slug, label], …]`; `assemble` builds the attribution
block from each stop's manifest entries (artist + license). Include every stop that has
images, plus fed-in extras (e.g. `cerrogordo`).

## Injected assets

`build/assets/enrich.css` (all the `.viz-*`, `.stop-geo`, `.jump`, `.moon`,
`.day-brief`, `.lb-*`, credits and print rules) and `lightbox.html` + `lightbox.js`
(tap-to-open pager: nav, dots, keyboard, swipe — no external libs). Style both light and
print; the print block hides interactive chrome (jump nav, lightbox, zoom hints).
