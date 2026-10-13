@AGENTS.md

# MONK

Mobile-first audiobook web app (Storytel-style). Black and white, no clutter, built for listening rather than browsing. The README has the full story; this file is the short list of things to know before changing code.

## Stack
- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4
- Prisma 7 + Postgres (via `@prisma/adapter-pg`); client is generated into `src/generated/prisma` (gitignored)
- Deploys to Vercel; `npm run build` runs migrations and the seed, so a host needs only `DATABASE_URL`
- Node 22. Scripts run with plain `node` (native `.env` loading + TypeScript type stripping), no TS runner

## Commands
- First run: `npm install` → `cp .env.example .env` (set `DATABASE_URL`) → `npm run setup` → `npm run dev`
- Before saying a change is done, run what CI runs: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
- `npm test` = `node --test 'src/**/*.test.ts'` (ingestion logic, search filters)
- `npm run db:seed` is idempotent; `npm run db:reset` drops everything and re-seeds

## Where things live
- `src/app/` pages and API routes (`api/progress`, `api/search`, `api/bookmarks`, `api/shelf`)
- `src/components/player/` the global player; `src/components/` everything else
- `src/lib/ingest/` crawler logic, sources in `src/lib/ingest/sources/` (`librivox`, `html`, `page`)
- `scripts/ingest.ts` ingestion entry point; `scripts/export-catalog.mjs` writes the catalogue file
- `prisma/seed-data/books.json` 5 hand-written dev books (placeholder audio)
- `prisma/seed-data/catalog.json` the real catalogue (LibriVox, English + Turkish), written by the Ingest workflow

## Rules
- **Next.js:** this Next version differs from training data. Read the guide in `node_modules/next/dist/docs/` before writing Next code (see AGENTS.md). Leave the AGENTS.md block alone; `next dev` rewrites it.
- **Imports:** code that scripts import (`src/lib/**`, `prisma/seed.mts`) uses explicit `.ts` extensions, and only syntax that type stripping allows (no `enum`, `namespace`, or constructor parameter properties).
- **No new dependencies** without asking. No shadcn, no icon packages: UI pieces are hand-built with Tailwind, icons live in `src/components/icons.tsx`.
- **Design:** black and white only, no hue. Hierarchy comes from brightness. Use the tokens in `src/app/globals.css` (`background`, `surface`, `foreground`, `muted`, `accent`, …), never raw colours. Dark is the default theme. Design for a phone first.
- **Player:** there is exactly one `<audio>` element, in the root layout, so playback survives navigation. Never add a second one.
- **Progress:** one row per user per book (chapter + offset). Saved every 5s while playing, on pause, on chapter change, and via `sendBeacon` when the tab closes. Reload restores position but never autoplays.
- **Users:** `userId` is a device id from `localStorage` (`src/lib/device-id.ts`). There is no auth yet; keep columns as plain strings.
- **Shelves:** `Shelf.status` is text, validated by `SHELF_STATUSES` in `src/lib/shelf.ts`. No database enum.
- **Offline:** the audio cache in `public/sw.js` is deliberately unversioned; a worker update must never delete a listener's downloads.
- **Ingestion:** obey `robots.txt` (unreadable = stop), one request at a time, at least 1s apart, and keep only titles that state a public-domain or free licence. Dry run by default; `--write` is opt-in. Real ingestion runs only from the manual "Ingest catalogue" GitHub workflow, never against the deployed database.
- **Attribution:** every book shows `sourceUrl`, `narrator` and `license` in the UI. Keep it that way.
- **Known trade-off, not a bug:** a missing book slug returns HTTP 200 with the not-found screen (see README, "soft 404s"). Don't try to "fix" it.

## Working with me
- Keep replies short, in plain, simple words.
- Make changes on a branch and open a pull request; don't push to `main`.
