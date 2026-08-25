# MONK

A mobile-first audiobook web app. Deep dark, one warm accent, no clutter —
built for listening rather than browsing.

Next.js (App Router) · TypeScript · Tailwind CSS · Prisma + Postgres · deploys
to Vercel.

---

## Status

Steps 1, 2, 4, 5 and 6 are done. Step 3 (ingestion) is blocked — see below.
Nothing has been crawled; the catalogue is 5 hand-written books.

| Step | | |
| --- | --- | --- |
| 1 | Setup, schema, 5-book seed | done |
| 2 | Book list, book page, global player with position saving | done |
| 3 | Ingestion script, full catalogue | blocked — see below |
| 4 | Search, library, shelves, bookmarks | done |
| 5 | PWA, offline downloads | done |
| 6 | Polish, empty/error states, skeletons | done |

### The player

One `<audio>` element lives in the root layout, so navigating between screens
never interrupts it. The mini-player sits above the tab bar on every screen and
opens the full player, which can be swiped down to dismiss.

Position is written to `Progress` every 5 seconds while playing, on pause, on
chapter change, and when the tab goes away (via `sendBeacon`, which survives
teardown where a normal `fetch` would be cancelled). There is one row per
listener per book, so resuming is a single lookup. Reloading restores the
chapter and second but never autoplays.

Chapters auto-advance; the last one stops and marks the book finished. Speed
(0.5x-3x), a sleep timer (5/15/30/45/60 minutes or end of chapter), skip back
15s / forward 30s, a chapter picker and the Media Session API (lock screen and
headphone controls) are all wired up.

### Search, shelves and bookmarks

Search is debounced at 150ms and covers title, author, narrator and category,
case-insensitively — Postgres `LIKE` is case-sensitive, so the query sets
`mode: "insensitive"` explicitly.

Shelves fill themselves: pressing play files a book under Listening, finishing
it moves it to Finished, and Save keeps one for later. Progress and shelf are
written in a single transaction.

Bookmarks are dropped from the player at the current position, and jump back to
the right chapter and second.

### Offline

Downloading a book fetches every chapter into a Cache Storage bucket that the
service worker serves from, and records the book in IndexedDB. Cancelling stops
the fetch and drops what already landed; chapters are only cached once they
arrive whole, so a cancelled download never leaves a truncated file.

The worker answers Range requests with a sliced `206`, so seeking works offline
instead of failing against a whole-file `200`. The audio cache is deliberately
unversioned — bumping the worker must never throw away a listener's downloads.

The Library reads downloaded books from IndexedDB and plays them from stored
metadata, so that screen works with no connection at all.

### Lighthouse

Run against `npm run build && npm run start` on localhost, mobile form factor,
Lighthouse 13:

| Screen | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| `/` | 96 | 100 | 100 | 100 |
| `/book/[slug]` | 97 | 100 | 100 | 100 |
| `/search` | 100 | 100 | 100 | 100 |
| `/library` | 93 | 100 | 100 | 100 |
| `/settings` | 98 | 100 | 100 | 100 |

Two caveats on those numbers. **Lighthouse no longer has a PWA category** — it
was removed in Lighthouse 12, so there is no PWA score to report; the install
criteria are verified directly instead (manifest shape, icons, a registered
worker, and navigation plus playback with the network off). And these runs are
against a local server, so they say nothing about real network conditions on a
deployed host.

The one audit that fails and stays failing is `bf-cache`, because the dynamic
routes send `Cache-Control: no-store`. Lighthouse marks both reasons "Not
actionable"; it is the cost of rendering the catalogue per request.

### A known trade-off: soft 404s

A book slug that does not exist renders the not-found screen but returns HTTP
`200`, not `404`. In Next 16 a dynamic route streams a static shell before the
data check runs, and the status cannot change once streaming has started; Next
injects `<meta name="robots" content="noindex">` so the page stays out of
search results. Returning a hard `404` would mean checking the slug before the
response streams — in `proxy`, which cannot reach the database here. Documented
in `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md`.

### On shadcn/ui

The brief called for shadcn/ui, but its registry (`ui.shadcn.com`) is
unreachable from this environment, so the handful of primitives needed — the
scrubber, tabs, sheets, icons — are hand-built with Tailwind instead. No icon
or component dependency was added.

### A note on local development

`npm run db:reset` drops and recreates every table, then re-seeds.

### Ingestion: written, never run against the real site

`seslikitab.org` cannot be reached from the environment this was built in — the
egress proxy answers `403` to the CONNECT — so its `robots.txt` and terms have
**not** been read by a human, and **nothing has been crawled**.

The crawler in `scripts/ingest.ts` therefore enforces the rules itself, at
runtime, rather than relying on someone having checked them first:

- **robots.txt is fetched before anything else and obeyed.** Longest-match
  Allow/Disallow per RFC 9309, `*` and `$` wildcards, and `Crawl-delay`. If it
  disallows the catalogue the run aborts. If it cannot be read at all the run
  aborts too — an unreadable robots.txt is treated as "no", never as
  permission.
- **One request at a time**, at least `INGEST_DELAY_MS` apart (floor 1s, raised
  to match `Crawl-delay`), with a `User-Agent` that identifies the crawler and
  backs off on 429/5xx honouring `Retry-After`.
- **Only public domain or freely licensed titles are kept.** A title with no
  stated licence is skipped, not assumed free; so is anything reserving rights.
  Every decision is logged to `logs/ingest.jsonl`.

Everything currently in the database comes from `prisma/seed-data/books.json`:
hand-written public domain works with locally generated placeholder narration,
not real recordings.

---

## Setup

Requires Node 20.12+ (22 recommended — the scripts use native `.env` loading and
TypeScript type stripping) and a Postgres database. Any Postgres will do: a
local server, a container, or a hosted one.

```bash
npm install
cp .env.example .env      # then set DATABASE_URL
npm run setup
npm run dev
```

`npm run setup` generates the Prisma client, applies the migration, draws the
placeholder covers, renders the sample audio, and seeds the catalogue. Open
http://localhost:3000.

A container is the quickest local database:

```bash
docker run --name monk-pg -e POSTGRES_USER=monk -e POSTGRES_PASSWORD=monk \
  -e POSTGRES_DB=monk -p 5432:5432 -d postgres:16
```

### Sample audio

`public/samples/` is generated, not committed (~15 MB). Each chapter is a tone
whose length exactly matches the duration in the seed data, and it opens with N
short beeps where N is the chapter number — so auto-advance to the next chapter
is audible while testing the player.

```bash
npm run sample:audio
```

---

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Generate the Prisma client, then build |
| `npm run setup` | Full first-run: client, database, covers, audio, seed |
| `npm run db:migrate` | Apply migrations to the database |
| `npm run db:push` | Push the schema without a migration (development only) |
| `npm run db:seed` | Seed from `prisma/seed-data/books.json` (re-runnable) |
| `npm run db:reset` | Drop everything and re-seed |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run covers` | Redraw placeholder cover art |
| `npm run icons` | Redraw the PWA icons |
| `npm run sample:audio` | Render placeholder narration |
| `npm run ingest` | Crawl the catalogue (dry run unless `-- --write`) |
| `npm test` | Unit tests for the ingestion logic |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

### Seeding

`npm run db:seed` is idempotent: books match on `slug` and chapters on
`(bookId, index)`, so re-running updates rows instead of duplicating them, and
chapters dropped from the seed file are deleted. To change the catalogue, edit
`prisma/seed-data/books.json` and re-run `npm run covers && npm run sample:audio
&& npm run db:seed`.

### Running the ingestion script

```bash
npm run ingest                     # 5 books, dry run — prints what it parsed
npm run ingest -- --write          # same, but saves to the database
npm run ingest -- --limit 200 --pages 20 --write
```

Writing is opt-in: the default run shows what it parsed and saves nothing, so
the first pass can be reviewed before anything touches the database. Re-running
is safe — books upsert on `sourceUrl`, chapters on `(bookId, index)`.

Configuration comes from the environment, never hardcoded:

| Variable | Purpose |
| --- | --- |
| `INGEST_BASE_URL` | Catalogue root |
| `INGEST_CATALOG_PATH` | Page the crawl starts from |
| `INGEST_BOOK_URL_PATTERN` | Which paths count as a book page |
| `INGEST_USER_AGENT` | Identifies the crawler to the source site |
| `INGEST_DELAY_MS` | Politeness delay; floor of 1s, raised by `Crawl-delay` |

**Expect the selectors to need tuning.** Extraction reads structured data first
(schema.org JSON-LD), then OpenGraph tags, then falls back to regex over the
HTML — an order chosen so the fragile part is last. None of it has seen the real
site's markup. Start with the dry run and read `logs/ingest.jsonl`; correct the
URL shape via `INGEST_BOOK_URL_PATTERN` before touching code.

The logic that does not depend on the live site is covered by tests:

```bash
npm test
```

32 assertions over robots.txt matching, the licence gate, duration parsing,
slug generation, link discovery and extraction. The crawler was also run
end to end against a local fixture server: it aborts when robots.txt
disallows, aborts when robots.txt is unreadable, ingests only the freely
licensed title, and stays idempotent across repeated runs.

---

## Data model

`prisma/schema.prisma`. `Book` has many `Chapter`s. `Progress`, `Bookmark` and
`Shelf` are per user per book.

`userId` is a device id from `localStorage` for now; the columns are plain
strings so a real `User` table can be added later without reshaping anything
else. `Shelf.status` is text (`saved` / `listening` / `done`) because SQLite has
no enum type — the allowed values live in `src/lib/shelf.ts`.

Progress is stored as a chapter plus an offset inside it, one row per user per
book, so resuming means loading a single row.

### Deploying

`npm run build` runs `prisma migrate deploy` before building, so a host only
needs `DATABASE_URL` set — the schema is applied on deploy. Seed the catalogue
once afterwards with `npm run db:seed`, or let the ingestion workflow populate
`prisma/seed-data/catalog.json` and seed from that.

The project started on SQLite and moved to Postgres because a serverless host
has no writable filesystem: progress, bookmarks and shelves are all writes, and
they would have failed on every request.

---

## Attribution

Every book carries `sourceUrl`, `narrator` and `license`, and the UI shows all
three — the catalogue card links back to the original page. Only public domain
or freely licensed titles are ingested.

## Environment variables

Copy `.env.example` to `.env`. `DATABASE_URL` is the only one the app itself
needs; the `INGEST_*` variables are for the ingestion script.
