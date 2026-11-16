# Commute Log

Turn a **Google Maps Timeline** export into an **AFAS**-ready CSV of office and
home days. Built because months of "where did you work today?" went unanswered.

Everything runs in the browser. Your location history is never uploaded, never
leaves the tab, and is not stored anywhere except in memory.

## Quick start

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Then either:

- drag your `Timeline.json` / `location-history.json` onto the page, or
- drop it in [`data/`](./data/README.md) and click it under **Found in ./data**
  (dev server only), or
- click **Load demo data** to try the whole flow with six months of fake history.

## Getting the export

**Android** — Google Maps → profile picture → Settings → Location & Privacy →
Export Timeline data. The file is `Timeline.json`.

**iPhone** — same menu, file is `location-history.json`.

**Older history** — Google Takeout → Location History (JSON). Extract the zip and
select the monthly `Semantic Location History` files, or `Records.json`.

All four shapes (Android, iOS, legacy Takeout, Records) are detected from the
content, so the file name does not matter.

## How days are classified

1. Every visit is measured against two circles: the office and home, each with a
   radius you control (default 150 m / 120 m).
2. Visits inside the office radius count as office time; inside the home radius
   as home time; everything else as "other".
3. Overlapping records are merged, so a nested visit (a lunch spot inside the
   office) never double counts.
4. Days with no visits fall back to raw breadcrumb positions, capped at 15
   minutes per breadcrumb and marked as lower-confidence evidence.
5. A day becomes **Office** when office time ≥ the threshold (default 2 hours),
   otherwise **Home** if home time ≥ the threshold, otherwise **Other**. Days
   without enough data are **No data** and flagged for review.
6. Weekends, Dutch public holidays, and anything you set to *Skip* are left out
   of the CSV. Any day can be overridden by hand.

Before you pin an office, places Google itself labels `WORK` / `HOME` are used as
a fallback, so the app is useful immediately after parsing.

## Exporting for AFAS

Defaults: semicolon delimiter, UTF-8 BOM, Dutch labels, `Datum;Dag;Locatie` plus
office/home minutes and a note. Every column can be toggled in the export panel.
"Other" and "No data" rows are excluded by default so you only hand HR rows you
actually confirmed.

AFAS only allows a limited backfill window, so the range picker has a
**Last 2 months** preset; export in chunks if you need more.

## Privacy

- Files are read with the File API and parsed in a Web Worker. No upload, no
  server, no analytics.
- The only network call is an optional address search, which sends the text you
  typed to OpenStreetMap's [Photon](https://photon.komoot.io/) service. Use
  coordinates or a Google Maps link instead if you prefer zero lookups.
- Office/home settings and manual day overrides are stored in `localStorage` on
  this device. The timeline itself is not persisted.

## Scripts

```bash
pnpm dev         # dev server
pnpm build       # static build in dist/
pnpm preview     # preview the build
pnpm test        # parser, classifier and CSV tests
pnpm typecheck   # tsc --noEmit
pnpm check       # Biome lint + format
```

## Deploying

The output is a static SPA, so Cloudflare Pages works without an adapter:

```bash
pnpm build
npx wrangler pages deploy dist
```

`public/_redirects` already contains the SPA fallback for direct navigation.

## Structure

```
src/lib/timeline/parse.ts   Google Timeline → normalized visits + points
src/lib/timeline/days.ts    day classification, clustering, summaries
src/lib/csv.ts              AFAS CSV writer
src/lib/holidays.ts         Dutch public holidays
src/lib/time.ts             wall-clock maths (timezone-safe day boundaries)
src/components/             UI
src/routes/index.tsx        the single page
```

Built with TanStack Router (SPA mode), React 19, Vite, Tailwind CSS v4 and Biome.
