# Worklocations

**Waar heb ik gewerkt?**

Your Google Maps Timeline knows where you were. This app turns it into a tidy
CSV of office and home days — drop in your timeline, check the days, download.
Everything happens in your browser.

No accounts, no server, no uploading your location history.

## Run it

```bash
nvm use         # Node 26
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

The default CSV contains `Datum;Locatie;Opmerking` and only office/home days.
Turn off **Only office/home rows** in the export options to include Verlof/PTO
and unknown days as well. Weekday, minutes, first/last seen and evidence are
optional columns.

Dutch and English are both available from the header; the app follows your
browser language on first visit.

## What stays private

Location history stays in your browser. Nothing is uploaded. Settings and day
overrides are saved in this browser only.

Two optional network calls exist: street lookup (OpenStreetMap Photon) and map
tiles (OpenStreetMap). Neither receives your location history.

## Deploy on Cloudflare via GitHub

Cloudflare now creates new projects as **Workers with static assets** (Pages is
their legacy workflow). This repo is set up for that path: `wrangler.jsonc`
points at `dist` and enables SPA fallback.

1. Push the repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages** → **Create** →
   **Continue with GitHub**.
3. Pick the repo. Use:
   - Build command: `pnpm build`
   - Deploy command: `npx wrangler deploy`
   - Environment variable: `NODE_VERSION=26`
4. Save and deploy. Every push to the connected branch rebuilds and deploys.

The old “Continue to Pages” flow also still works if you prefer it, but then
Cloudflare serves `dist` directly and the Worker config is unused.

CI runs the same `pnpm check-all` gate on every push and pull request:
[`.github/workflows/ci.yml`](.github/workflows/ci.yml).

The repo also has a native Git pre-commit hook in `.githooks/pre-commit` that
runs `pnpm check-all`. `pnpm install` points Git at it via `core.hooksPath`;
no Husky or extra dependency.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` | Static production build in `dist/` |
| `pnpm deploy` | Deploy the build with wrangler |
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
