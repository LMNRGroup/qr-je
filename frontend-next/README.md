# QR Code Studio — Next.js migration

This directory is the isolated Next.js version of the QR Code Studio frontend.
The original Vite application remains in `../frontend` and can continue running
independently.

## Local development

```sh
npm install
npm run dev
```

The Next.js app runs on [http://localhost:8081](http://localhost:8081). The
existing Vite app keeps its original port.

The backend should run on port `3000` for local API, redirect, adaptive QR, and
public-data requests. Set `API_PROXY_ORIGIN` to use a different backend origin.

## Validation

```sh
npm run typecheck
npm run lint
npm run build
npm run smoke   # boots the production build and checks the non-backend routes
```

These four steps also run in CI (`.github/workflows/frontend-next.yml`) on any
change under `frontend-next/`. The build fails fast if the required Supabase env
vars are missing in a production build (see env list below).

## Migration architecture

The app ships as a **static export** (`output: 'export'` in `next.config.mjs`):
a client-rendered SPA served as plain static files, with **no per-request server
compute** on Vercel. Every route is prerendered to static HTML at build time and
all data is fetched client-side from the separate backend API. SSR is
intentionally parked until we decide what (if anything) needs it.

Routing notes:

- The public **viewer** routes (`/file/:id/:random`, `/menu/:id/:random`) are
  served by single static shells (`src/app/file`, `src/app/menu`). The real
  `id`/`random` are read from the URL on the client (`src/lib/spa-route.ts`);
  Vercel rewrites the full URL onto the shell.
- Public **vCard** pages (`/v/:slug`, `/:owner/:slug`) and the scan/redirect
  flow (`/r/...`, `/adaptive/...`, `/public/...`) are proxied to the backend HTML
  renderer and scan-tracking flow.
- Production proxying lives in `vercel.json` (edge rewrites — no function
  compute). Static export ignores `next.config.mjs` rewrites, so an equivalent
  set is defined there for `next dev` only, to mirror production locally.

Interactive screens load through explicit client boundaries; shared providers
and footer layout live in the root layout. React Router is no longer installed.

For compatibility during the transition, `next.config.mjs` accepts both the new
`NEXT_PUBLIC_*` environment variables and the existing `VITE_*` names. New
deployments should use:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_MOBILE_UI_V2`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `API_PROXY_ORIGIN` (`next dev` proxy destination)

> **Note:** `vercel.json` proxies to `https://api.luminarapps.com`. Because
> `vercel.json` can't read env vars, update it directly if the backend origin
> changes.
