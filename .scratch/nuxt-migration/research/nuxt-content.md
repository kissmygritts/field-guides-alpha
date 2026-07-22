# Nuxt Content vs. plain `content/*.yml` + typed composable

**Ticket:** How should per-guide structured data be loaded and typed in Nuxt, and does Nuxt Content fit?
**Nuxt Content version verified:** v3 is current and stable — latest release **v3.15.0 (2 Jul 2026)**; v3.0.0 shipped 16 Jan 2025. Requires Nuxt 3/4. ([release blog](https://content.nuxt.com/blog/v3), [getting-started](https://content.nuxt.com/docs/getting-started))

## Verdict

Nuxt Content v3 **does technically fit** — a `data`-type collection sourced from `content/*.yml` with a Zod schema gives you exactly a typed YAML store, and it deploys to Cloudflare Pages as a fully static site (WASM SQLite in the browser, zero server code). But for data THIS structured (no markdown body) it buys you little over a plain `content/*.yml` + typed composable, while adding a SQLite/WASM build pipeline and a ~client-side DB payload. **Recommendation: skip Nuxt Content; read `content/*.yml` directly with a Zod-validated typed composable.** The deciding factor is the future drafting app — Content entries are build-time only, so a read/write app has to bypass Content anyway.

## Findings

### 1. Nuxt Content v3 collections — typed, `.yml`/`.json`/`.md`, Zod validation

Collections are defined in `content.config.ts` via `defineContentConfig` + `defineCollection`. Two collection **types**:

- **`page`** — 1:1 mapping of a content file to a route. Auto-injects `path`, `title`, `description`, `body` (parsed AST), `seo`, `navigation`. Meant for markdown-body content.
- **`data`** — arbitrary structured data with **no auto-injected page fields**; you own the entire schema. This is the right type for `.yml`/`.json` records that aren't pages.

([collection types](https://content.nuxt.com/docs/collections/types), [define](https://content.nuxt.com/docs/collections/define))

A `data` collection over YAML files:

```ts
// content.config.ts
import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    guides: defineCollection({
      type: 'data',
      source: 'guides/**.yml',       // also accepts .json / .md
      schema: z.object({
        slug: z.string(),
        title: z.string(),
        description: z.string(),
        stops: z.array(z.object({
          name: z.string(),
          gps: z.tuple([z.number(), z.number()]),
          elevation: z.number(),
        })),
        day: z.string().optional(),
        moonWindow: z.object({ start: z.date(), end: z.date() }).optional(),
        credits: z.array(z.string()),
      }),
    }),
  },
})
```

Zod validation runs at **build/parse time**: files that violate the schema fail the build, and the schema is what generates the TypeScript types you get back from queries. `.yml`, `.json`, and `.md`-with-frontmatter are all valid sources; for pure structured data you use `.yml`/`.json` with `type: 'data'` and skip the markdown machinery entirely. (Zod is re-exported from `@nuxt/content`.)

### 2. Querying — one guide (dynamic route) + index page

Query with the auto-imported `queryCollection()` composable, wrapped in `useAsyncData`. ([query-collection](https://content.nuxt.com/docs/utils/query-collection))

One guide by field (dynamic route `pages/guides/[slug].vue`) — for a `data` collection you filter on your own field rather than the page `path`:

```ts
const route = useRoute()
const { data: guide } = await useAsyncData(`guide-${route.params.slug}`, () =>
  queryCollection('guides').where('slug', '=', route.params.slug).first()
)
```

(For `page` collections the idiomatic form is `.path(route.path).first()`, since `path` is a special generated field — but that's the page-routing case, not ours.)

Index / listing page:

```ts
const { data: guides } = await useAsyncData('guides-index', () =>
  queryCollection('guides')
    .order('title', 'ASC')
    .select('slug', 'title', 'description')
    .all()
)
```

Chainable methods: `.where(field, op, value)`, `.order(field, 'ASC'|'DESC')`, `.select(...fields)`, `.first()`, `.all()`, `.path(str)` (page collections). Server routes take the H3 event first: `queryCollection(event, 'guides')`.

### 3. Trade-off — Nuxt Content vs. plain `content/*.yml` + typed composable

For data this structured with only short description strings (no rendered markdown body), what Nuxt Content actually provides over a hand-rolled loader:

| | Nuxt Content `data` collection | `content/*.yml` + typed composable |
|---|---|---|
| Typed access | Yes, from Zod schema | Yes, from the same Zod schema |
| Build-time validation | Yes | Yes (run `schema.parse()` in the loader) |
| Markdown rendering (`<ContentRenderer>`, AST) | Yes — **unused here** | N/A (not needed) |
| Query API (`where/order/select`) | Yes, SQL-backed | Plain JS `.filter()/.map()/.sort()` |
| Client-side query on nav | WASM SQLite loaded in browser | data is already in the bundle |
| New dependency + build step | `@nuxt/content` + SQLite/WASM pipeline | none beyond `zod` |
| Payload cost | ships a SQLite DB dump for client queries | ships only the JSON you import |

Nuxt Content's core value proposition is **markdown-heavy content** (parsing, AST, `<ContentRenderer>`, syntax highlighting, navigation trees). None of that applies to a highly-structured record set with short strings. Stripped to `type: 'data'`, it degrades to "a typed YAML store with a SQL query layer" — and for a handful of guides you don't need SQL; a Zod-validated `import.meta.glob` (or Nitro `queryContent`-free read) plus array methods is simpler, has no WASM/DB payload, and keeps types fully in your control.

A minimal typed composable:

```ts
// composables/useGuides.ts
import { z } from 'zod'
const guideSchema = z.object({ /* … as above … */ })
export type Guide = z.infer<typeof guideSchema>

const modules = import.meta.glob('~/content/guides/*.yml', {
  eager: true, import: 'default',
})
const guides: Guide[] = Object.values(modules).map(m => guideSchema.parse(m))
// (needs a yml loader, e.g. @rollup/plugin-yaml / vite yaml plugin)

export const useGuides = () => guides
export const useGuide = (slug: string) => guides.find(g => g.slug === slug)
```

This validates at build (bad YAML fails the build), gives full inferred types, and adds zero runtime DB.

### 4. Runtime writability — build-time only

Nuxt Content collections are **build-time only**. The pipeline parses source files into a SQLite database during build/dev; there is no supported API to create or edit entries at runtime in a deployed static site. The official editing story (Nuxt Studio) edits source files and triggers a rebuild/commit — it is not a runtime datastore. ([database advanced](https://content.nuxt.com/docs/advanced/database))

For the **future drafting app** that reads/writes entries, Nuxt Content cannot be the write path regardless of choice — you'd need your own storage (a real DB, a KV/D1 binding, filesystem-on-a-server, or a git-commit flow). This weakens the case for adopting Content: you'd end up maintaining two data paths (Content for read, something else for write). A plain typed-composable + Zod schema is reusable directly against whatever runtime store the drafting app writes to (validate the same schema on write, serialize back to `content/*.yml`).

### 5. Static output (`nuxt generate`) on Cloudflare Pages, zero server code

**Nuxt Content:** a fully prerendered site works with no server DB. Exact doc wording — for static deployment "Nuxt Content will load the database in the browser using WASM SQLite," so client-side navigation queries run in the browser. A **D1** database is only required when running **server-side** on Cloudflare Workers (SSR); it is *not* required for a fully static `nuxt generate` build. ([deploy/static](https://content.nuxt.com/docs/deploy/static), [database config](https://content.nuxt.com/docs/getting-started/configuration), [deploy/cloudflare-pages](https://content.nuxt.com/docs/deploy/cloudflare-pages)). Caveat: the Cloudflare Pages doc is written assuming server rendering and states "A D1 database... is required" — that applies to the SSR/Workers path, not pure SSG. Fully static still ships a client-side SQLite DB dump as a static asset (extra payload).

**Plain YAML + composable:** trivially static. Data is bundled at build; `nuxt generate` prerenders every route; the output is plain HTML/JS with zero server code and zero DB. This is the cleanest fit for the project's stated "static-hostable, zero server code" constraint.

Both satisfy the Cloudflare Pages / `nuxt generate` requirement; the plain approach does so with a smaller payload and no SQLite/WASM.

## Recommendation

**Use `content/*.yml` (or `.json`) + a typed composable backed by a shared Zod schema. Do not adopt Nuxt Content for this.**

Reasoning:
1. The data is structured records with short strings — Nuxt Content's markdown/AST/renderer value is entirely unused; you'd be running it purely as a typed YAML store with a SQL layer you don't need at this scale.
2. Both approaches give the same thing that actually matters here — Zod build-time validation + inferred TypeScript types — but the plain approach adds no `@nuxt/content` dependency, no SQLite/WASM build step, and no client-side DB payload.
3. Both deploy fine to Cloudflare Pages via `nuxt generate` with zero server code; the plain approach is lighter.
4. **The future drafting app is the tiebreaker.** Content entries are build-time only, so a read/write app must use a separate write path either way. A single Zod schema shared between a read composable and the drafting app's write/serialize logic keeps one source of truth; adopting Content would force you to maintain Content-for-read plus a parallel write path.

Adopt Nuxt Content later only if guides grow substantial markdown bodies (rich prose, embedded components, syntax highlighting) or you want Nuxt Studio's git-based editing UI — neither is the current shape of the data.

## Sources

- Nuxt Content v3 announcement / version — https://content.nuxt.com/blog/v3
- Getting started (v3) — https://content.nuxt.com/docs/getting-started
- Collection types (page vs data) — https://content.nuxt.com/docs/collections/types
- Defining collections + Zod schema — https://content.nuxt.com/docs/collections/define
- queryCollection API — https://content.nuxt.com/docs/utils/query-collection
- Database / adapters config — https://content.nuxt.com/docs/getting-started/configuration
- Advanced database (WASM SQLite, build-time) — https://content.nuxt.com/docs/advanced/database
- Static deployment — https://content.nuxt.com/docs/deploy/static
- Cloudflare Pages deployment — https://content.nuxt.com/docs/deploy/cloudflare-pages
- Latest release v3.15.0 — https://github.com/nuxt/content/releases
