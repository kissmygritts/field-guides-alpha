# [research] Nuxt Content — typed collections & data loading

Type: research
Status: resolved
Blocked by: —

## Question

How should per-guide structured data be loaded and typed in Nuxt, and does Nuxt
Content fit — or is a plain `content/*.yml` + custom composable the better call?

Surface the facts that ticket 01 (data model) and ticket 05 (rendering) wait on:
- Nuxt Content v3 **collections**: defining a typed collection, `.yml`/`.json`/`.md`-frontmatter support, and the **Zod schema** story for validating a guide entry.
- Querying a collection to render one guide page + an index/listing page.
- Whether Nuxt Content is worth the dependency here vs. reading `content/*.yml` directly with a typed composable, given the data is highly structured (not markdown-body-heavy).
- Anything relevant to a future **drafting app** reading/writing these entries (are they writable at runtime, or build-time only?).
- Compatibility with `nuxt generate` static output on Cloudflare Pages.

Findings → `.scratch/nuxt-migration/research/nuxt-content.md`, linked back here.

## Answer

Findings: [research/nuxt-content.md](../research/nuxt-content.md)

- **Nuxt Content is v3** (v3.15.0). It *can* fit via a `type: 'data'` collection over `content/*.yml` + a Zod schema — but for records this structured (short strings, no markdown body) it's **overkill**: adds a SQLite/WASM pipeline + client DB payload while its markdown/AST/renderer value goes unused.
- **Recommendation: skip Nuxt Content.** Read `content/*.yml` directly with a **Zod-validated typed composable** — same build-time validation + inferred types, lighter. Both deploy to Cloudflare via `nuxt generate` with zero server code.
- **Tiebreaker = the future drafting app:** Content entries are build-time only, so a read/write app needs a separate write path *either way*. A single shared **Zod schema** as the one source of truth is the clean move.
- **Implication for ticket 01:** format = `content/<slug>.yml`, contract = a shared Zod schema (not a Content collection).
