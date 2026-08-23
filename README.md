# MONK

A mobile-first audiobook web app. Deep dark, one warm accent, no clutter —
built for listening rather than browsing.

Next.js (App Router) · TypeScript · Tailwind CSS · Prisma + SQLite · deploys to
Vercel.

---

## Status

Build steps 1-2 of 6 are done: setup and schema, a seeded catalogue of 5
hand-written books, and a working global player. Nothing is crawled yet.

| Step | | |
| --- | --- | --- |
| 1 | Setup, schema, 5-book seed | done |
| 2 | Book list, book page, global player with position saving | done |
| 3 | Ingestion script, full catalogue | blocked — see below |
| 4 | Search, library, shelves, bookmarks | next |
| 5 | PWA, offline downloads | |
| 6 | Polish, empty/error states, skeletons | |

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

Not yet built, by design: the Save/shelf button and bookmarks (step 4) and the
download button (step 5).

### A note on local development

`npm run db:reset` replaces the SQLite file. A `next start` server holds an open
handle to the old one, so restart the server after resetting the database.

### Ingestion is blocked

`seslikitab.org` cannot be reached from this environment — the egress proxy
answers `403` to the CONNECT, so its `robots.txt` and terms have **not** been
read. No ingestion code has been written and nothing has been crawled. Step 3
stays parked until the terms can be checked from a network that can reach the
site.

Everything in `prisma/seed-data/books.json` is hand-written: public domain works
with locally generated placeholder narration, not real recordings.

---

## Setup

Requires Node 20.12+ (22 recommended — the scripts use native `.env` loading and
TypeScript type stripping).

```bash
npm install
cp .env.example .env
npm run setup
npm run dev
```

`npm run setup` generates the Prisma client, creates the SQLite database, draws
the placeholder covers, renders the sample audio, and seeds the catalogue. Open
http://localhost:3000.

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
| `npm run db:push` | Apply `prisma/schema.prisma` to the database |
| `npm run db:seed` | Seed from `prisma/seed-data/books.json` (re-runnable) |
| `npm run db:reset` | Drop everything and re-seed |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run covers` | Redraw placeholder cover art |
| `npm run sample:audio` | Render placeholder narration |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

### Seeding

`npm run db:seed` is idempotent: books match on `slug` and chapters on
`(bookId, index)`, so re-running updates rows instead of duplicating them, and
chapters dropped from the seed file are deleted. To change the catalogue, edit
`prisma/seed-data/books.json` and re-run `npm run covers && npm run sample:audio
&& npm run db:seed`.

### Running the ingestion script (step 3, not yet written)

It will live at `scripts/ingest.ts` and read its configuration from the
environment — never hardcoded:

- `INGEST_BASE_URL` — catalogue root
- `INGEST_USER_AGENT` — identifies the crawler to the source site
- `INGEST_DELAY_MS` — politeness delay, keep at 1000 or higher

It will be run against 5 titles first for review before any full crawl, will
upsert on `Book.sourceUrl`, and will log skipped or broken items to a file.

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

### Moving to Postgres

1. Change `provider` in `prisma/schema.prisma` to `postgresql`.
2. Swap the adapter in `src/lib/db.ts` for `@prisma/adapter-pg`.
3. Point `DATABASE_URL` at the new server and run `npm run db:push`.

---

## Attribution

Every book carries `sourceUrl`, `narrator` and `license`, and the UI shows all
three — the catalogue card links back to the original page. Only public domain
or freely licensed titles are ingested.

## Environment variables

Copy `.env.example` to `.env`. `DATABASE_URL` is the only one the app itself
needs; the `INGEST_*` variables are for the ingestion script.
