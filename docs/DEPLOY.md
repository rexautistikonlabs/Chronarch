# DEPLOY.md — the static site

The RexMetrix landing and Chronarch are one static Vite build. No backend, no
server code, no environment secrets: the site spawns nothing, opens no socket,
reads no filesystem and calls no model. Deploying is copying `web/dist/` to a
static host.

## Build

```
cd web
npm ci --legacy-peer-deps
npm run build          # → web/dist/
```

`npm run build` type-checks and bundles; `npm test` (vitest) and
`npm run check:loops` are the gate before a build is published.

## Routes the host must serve

The app is a single-page application. Every path must fall back to
`index.html`:

| Path | What |
|---|---|
| `/` | the RexMetrix landing (catalogue) |
| `/chronarch` | Chronarch — the programme well |
| `/chronarch/tech` | Chronarch — the technician's workbench |
| `/chronarch/about` | About Chronarch |
| `/tech`, `/lab`, `/about`, `/consortium`, retired protocol paths | client-side redirects into the above (bookmarks keep working) |

**SPA fallback: `/*` → `/index.html`.** How to say that depends on the host:

- Netlify / Cloudflare Pages: `web/public/_redirects` is copied into `dist/`
  and already reads `/*    /index.html   200`.
- GitHub Pages: no rewrite rules — copy the entry point to the 404 page after
  the build: `cp dist/index.html dist/404.html`.
- nginx: `try_files $uri /index.html;`.
- Any other static host: its "single-page app" or "history API fallback"
  setting.

## Domain

Intended hosts, **later** — none of this is configured from the repository,
and nothing here claims either host is live, resolves, or has certificates:

| Host | Serves |
|---|---|
| `rexmetrix.com` | the landing (`/`, the campus story) |
| `chronarch.rexmetrix.com` | this same app opened at `/chronarch` (the product) |

Both would be the one static build; the second is a hostname that lands on
`/chronarch`, which a host's redirect rule (or the SPA fallback plus a small
redirect) can do without a second build. Until DNS exists, the app is one
origin and `/chronarch` is a path.

`web/public/CNAME` contains exactly `rexmetrix.com`. It is copied into
`dist/` by the build. **Domain reserved for the RexMetrix landing.** Nothing in
this repository claims that DNS for it is live, points anywhere, or has been
configured; the file is the reservation, not the record.

## What deploying does not do

- no DNS changes from this repository
- no analytics, cookies or telemetry are added by the build
- no server-side rendering, functions or databases
- the project a visitor builds in Chronarch stays in their browser
  (`localStorage` key `rexmetrix.project.v1`) and leaves only as a file they
  download
