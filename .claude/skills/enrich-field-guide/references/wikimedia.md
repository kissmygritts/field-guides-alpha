# Wikimedia Commons — sourcing notes

The API client is `build/lib/wikimedia.mjs`. These are the lessons it encodes; read
before debugging a fetch.

## 429 / User-Agent (the #1 blocker)

Commons blocks anonymous or bot-ish User-Agents with **HTTP 429** ("Your bot is making
too many requests"). The client sends a descriptive UA with a contact — you must supply
the contact via env:

```
export WM_CONTACT="offline photo reference; you@example.com"
```

It already backs off exponentially on 429 (7s, 11s, 15s…) and throttles ~1.4s between
downloads. If you still get 429s, **slow down further** — don't parallelize fetches.
Downloads can partially fail mid-run; the candidate index only records what landed, so
counts may be short. Just re-run; existing files aren't clobbered destructively.

## Category vs. search

- **`mode: "category"`** — `generator=categorymembers` over a `Category:…`. Best when a
  clean category exists (`Category:Bodie, California`, `Category:Manzanar National
  Historic Site`). Dense, on-topic results.
- **`mode: "search"`** — `generator=search` with **`filetype:bitmap`** appended
  automatically. Use when no good category exists. The `filetype:bitmap` filter is what
  keeps PDFs, maps, book scans and SVG diagrams out of the results.

Category names are guessable but often wrong (`Category:Fossil Falls (California)` did
not exist; a `search` for "Fossil Falls Coso Owens California" did). If a category
returns 0 pages, fall back to search. Candidates are filtered to ≥ 800×600 to drop
thumbnails and icons.

**A category also changes source order.** In `fetch.mjs`, a stop that names any
`{mode:'category'}` query sources **Wikimedia first** (instead of Unsplash→Flickr→
Wikimedia). This is the fix for obscure place names: Unsplash's text search returns a
full page of off-topic frames (a different lake/town of the same name), fills the 36
cap, and the on-topic Commons category never runs. Because Wikimedia titles are
reliable, you can then curate those stops from titles and only glance at a sheet to
spot-check — instead of vision-reading every grid.

## Verify attribution — never guess

`imageInfo()` pulls `Artist` and `LicenseShortName` from the API's `extmetadata` and
strips the HTML Commons wraps them in. **Use those values.** In an earlier build a
guessed credit ("Bkimbriel CC BY 3.0") was wrong; the real one was "oliver.dodd CC BY
2.0". The manifest and credits must reflect what the API actually returns.

## Licenses

CC BY, CC BY-SA, CC0 and Public domain are all fine **with attribution**. The credits
block lists artist + license per stop automatically from the manifest. Don't use
anything without a clear reuse license.
