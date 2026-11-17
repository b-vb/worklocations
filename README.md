# Waar heb ik gewerkt?

Your Google Maps Timeline knows where you were. AFAS wants to know whether you
were at the office or at home. This app connects the two: drop in your timeline,
check the days, download a CSV. Everything happens in your browser.

No accounts, no server, no uploading your location history.

## Run it

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

## Get your Timeline file

**iPhone** — Google Maps → profile picture → Settings → Location & Privacy →
Export Timeline data. You get `location-history.json`.

**Android** — same menu. You get `Timeline.json`.

Drop the file on the page. It is parsed locally in a worker, so large exports
will not freeze the tab. Old Google Takeout files are not supported.

## Using it

1. **Open your export.** The upload card collapses once it is loaded.
2. **Confirm work and home.** Use the suggested places, or open the map to pin
   the exact spot and radius. These settings are remembered in this browser.
3. **Pick the period.** Starts at the last 12 months; presets are clamped to the
   data you actually have. Working days and the 07:00–19:00 window live behind
   the gear if you need them.
4. **Check the days.** Anything that needs a decision is highlighted. Mark a day
   as **Verlof/PTO** when you were off. Changes are saved per day.
5. **Download.** Filename: `werkplekken-2026-11-17.csv`.

The default AFAS file contains `Datum;Locatie;Opmerking` and only office/home
days. Turn off **Only office/home rows** in the export options to include
Verlof/PTO and unknown days as well. Weekday, minutes, first/last seen and
evidence are optional columns.

Dutch and English are both available from the header; the app follows your
browser language on first visit.

## What stays private

Location history stays in your browser. Nothing is uploaded. Settings and day
overrides are saved in this browser only.

Two optional network calls exist: street lookup (OpenStreetMap Photon) and map
tiles (OpenStreetMap). Neither receives your location history.

## Deploy on Cloudflare Pages via GitHub

Yes. Cloudflare can build directly from this GitHub repo:

1. Push the repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**.
3. Pick the repo and use:
   - Build command: `pnpm build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION=24`
4. Save and deploy. Every push to the connected branch rebuilds the site.

`public/_redirects` handles the single-page fallback. The build is fully static;
no Cloudflare Functions or adapter are needed.

A separate GitHub Actions workflow runs lint, typecheck, tests, Knip and the
production build on every push and pull request:
[`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` | Static production build in `dist/` |
| `pnpm preview` | Preview the production build |
| `pnpm test` | Unit, machine and browser-like smoke tests |
| `pnpm typecheck` | TypeScript |
| `pnpm check` | Biome lint and format |
| `pnpm knip` | Unused files, exports and dependencies |

## Stack

TanStack Router (SPA), React 19, Vite, Tailwind CSS v4, XState v6 (beta),
i18next and Biome. The runtime state machines live in
[`src/machines/`](src/machines); pure calculations (timeline parsing, day
classification, CSV writing) stay pure functions.
