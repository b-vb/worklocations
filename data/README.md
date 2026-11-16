# Local data (not committed)

Drop your Google Maps Timeline export in this folder. Suggested name:

```
data/Timeline.json
```

While `pnpm dev` is running, files in this folder show up in the app under
**Found in ./data** — one click loads them. You can also drop the file straight
onto the page; that works in any build.

Everything in this folder is gitignored. It never enters a build and never
leaves your machine.
