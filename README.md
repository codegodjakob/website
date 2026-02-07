# Website Architecture

## Structure

- `index.html` + `main.js`: Floating bubble homepage
- `about.html` + `about.js`: About placeholder page
- `page.html` + `page.js`: Project detail page
- `admin.html` + `admin.js`: Admin editor
- `page-editor.html` + `page-editor.js`: Per-project section editor
- `api/site-state.js`: Central state read/write endpoint
- `api/admin-auth.js`: Admin token validation endpoint

## Shared Modules

- `shared/constants.js`: Storage keys, theme lists, default values
- `shared/url.js`: URL normalization/validation/embed conversion
- `shared/storage.js`: Schema migration and storage helpers
- `shared/sync-core.js`: Local/remote state collect/apply logic

## Homepage Split

- `bubble-physics.js`: Motion helpers, bounds, overlap helpers
- `bubble-render.js`: Text wrapping and bubble layout
- `sunset-theme.js`: Theme controller for sunset transition
- `main.js`: Orchestration and UI wiring

## State Model

- The app uses `localStorage` and a schema version key: `site-state-version`.
- Migration runs on page load (`migrateState`) and normalizes:
  - bubble records
  - visibility map
  - categories
  - about/contact/social payloads

## Admin Access Guard

- `admin.html` loads `admin-guard.js` before `admin.js`.
- Guard validates `ADMIN_SYNC_TOKEN` via `/api/admin-auth`.
- Session is cached in local storage for 8 hours (`site-admin-session-until`).

## Tests

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

## Deploy Prerequisites (Vercel + Supabase)

Set environment variables in Vercel:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_SYNC_TOKEN`
- optional `SUPABASE_SITE_STATE_TABLE` (default `site_state`)
- optional `SUPABASE_SITE_STATE_ID` (default `1`)

Create table once in Supabase SQL Editor:

```sql
create table if not exists public.site_state (
  id bigint primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
```
