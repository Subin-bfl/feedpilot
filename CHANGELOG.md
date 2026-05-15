# Changelog

All notable changes to this project are documented in this file.

## 2026-05-15

### Added
- **`src/lib/xmlSyncConfig.ts`**: reads `XML_FETCH_TIMEOUT_MS` and `XML_SYNC_TRANSACTION_TIMEOUT_MS` for store XML URL sync (large / slow remote feeds).
- **`.env.example`**: documents optional XML sync timeout variables.

### Changed
- **Store XML URL sync** (`src/services/storeXmlSync.ts`):
  - XML download timeout default raised from **30s to 3 minutes** (`XML_FETCH_TIMEOUT_MS`, default `180000`).
  - Prisma import transaction timeout default **5 minutes** (`XML_SYNC_TRANSACTION_TIMEOUT_MS`, default `300000`) so large product imports are not cut off by the former 5s interactive transaction default.
  - Clear error when the download aborts, with guidance to raise `XML_FETCH_TIMEOUT_MS`.
  - When **`REDIS_URL`** is set, channel-feed regeneration after sync is **queued** via BullMQ (`enqueueGenerate`) instead of blocking the HTTP request; UI notes that the worker must be running.
- **`POST /api/stores/[id]/sync`**: `maxDuration = 300` for platforms that honor route duration limits; response includes `{ channelFeedsQueued: boolean }`.
- **`XmlSyncSettings`**: success message distinguishes full inline sync vs background channel-feed updates.

### Fixed
- **Heavy / large XML feeds** timing out during manual “Sync now” or scheduled sync (download cap and Prisma transaction budget).

## 2026-05-14

### Added
- **XML URL sync scheduler** as its own process: `src/lib/xmlSyncScheduler.ts`, `src/scripts/xmlSyncSchedulerDaemon.ts`, npm script `npm run xml-sync-scheduler` (polls every minute, runs `syncDueStoresFromXmlUrl`).
- **Railway combined start**: `scripts/start-web-and-xml-scheduler.mjs` and `npm run start:web+xml`; `railway.json` `startCommand` runs `npx prisma db push && npm run start:web+xml` so scheduled store XML sync works without a separate Redis worker.
- **`npm run clean`**: removes `.next` to recover from stale or corrupted Next.js build output (especially on Windows when `dev` and `build` overlap).
- **`dotenv`** dependency for the scheduler daemon loading `.env` outside Next.
- **`src/lib/publicOrigin.ts`**: resolves the browser-facing origin from proxy headers (`Host`, `X-Forwarded-*`) and `APP_URL` / `NEXTAUTH_URL`, so redirects work on Railway (internal bind) and on `localhost` dev.
- **`.cursor/rules/local-and-railway.mdc`** (`alwaysApply: true`): project rule that changes must work locally and on Railway.
- **`(auth)/login/layout.tsx`**: if a session already exists, visiting `/login` redirects to `/dashboard`.
- **`GET /api/logout`**: optional server sign-out that sweeps NextAuth cookie names (including chunked session tokens) with both `secure` variants for reliable deletion.

### Changed
- **Root `/`**: always redirects to **`/login`** first (public entry); signed-in users are forwarded to `/dashboard` from the login layout.
- **NextAuth sign-out**: `SignOutButton` and profile flows use **`signOut({ callbackUrl: `${window.location.origin}/login` })`** so cookies clear correctly on http (local) and https (Railway).
- **`feed.worker.ts`**: BullMQ job processor only; **removed** the XML sync `setInterval` loop (scheduler is no longer tied to Redis / worker).
- **README / `.env.example`**: clarified `NEXTAUTH_URL` / `APP_URL` for Railway vs localhost; troubleshooting for sign-out and session cookies.
- **Middleware matcher**: explicit bare paths (e.g. `/dashboard`, `/stores`) plus `/:path*` variants for consistent `withAuth` coverage.
- **Sidebar navigation**: **Users** link is shown only for **`OWNER`** and **`ADMIN`** (`isAdminRole`); `STANDARD` and `READONLY` do not see it ( `/users` remains server-guarded).

### Fixed
- **Railway sign-out / redirect host**: avoid building redirect URLs from internal bind hosts (`127.0.0.1`, etc.); treat **`localhost`** as a valid dev hostname when resolving origins (fixes local redirects after stricter public-host logic).
- **Documentation**: corrected README claims that XML schedule ran inside the BullMQ worker; aligned “Resume work later” with `xml-sync-scheduler` vs `worker` roles.

## 2026-05-07

### Added
- Organization roles and access levels:
  - `OWNER` / `ADMIN` (admin)
  - `STANDARD` (write access, no user management)
  - `READONLY` (read-only; write endpoints return 403)
- Multi-org support with `User.activeOrganizationId` and active-org resolution at sign-in.
- User management module (admin-only): `/users` with member creation (temp password), role changes, and removal.
- Profile section: `/profile` to update name/password, switch active org, and delete account (protected against deleting last admin).
- Admin-only factory reset endpoint and UI (wipes org data, keeps org + members).
- Template seeding helpers:
  - Auto-create default templates on new org registration.
  - One-click “Create default templates” action on the Templates page for existing orgs.
- Railway/Supabase readiness:
  - Prisma `DIRECT_URL` support for separating pooled vs direct DB connections.
  - `jsconfig.json` for stable `@/*` path alias resolution in production builds.

### Changed
- RBAC is enforced server-side in write API routes (stores, channel feeds, templates, source feed uploads).
- Railway startup uses `prisma db push` (this repo does not ship `prisma/migrations`).
- Railway build installs devDependencies so PostCSS/Tailwind plugins (e.g. `autoprefixer`) are available.
- Login page no longer pre-fills demo credentials.
- Seed script no longer prints demo credentials by default (set `SHOW_DEMO_CREDENTIALS=true` to print locally).

### Fixed
- Multiple layout/alignment fixes across app shell, Stores, and Channel Feed pages.
- Mapping UI alignment: table-like row layout with per-row expandable “Value edits”.
- Templates page TypeScript union narrowing (`type` field) to satisfy build checks.
- Users table runtime error by adding explicit TanStack table column IDs.

## 2026-05-01

### Added
- Store XML URL configuration with selectable sync cadence (`HOURLY`, `DAILY`, `WEEKLY`).
- Store XML sync service and scheduler integration in worker loop.
- Manual store XML sync endpoint: `POST /api/stores/[id]/sync`.
- Stable public channel feed XML endpoint: `GET /api/public/channel-feeds/[token]/feed.xml`.
- UI controls to copy channel feed XML URL.
- UI delete buttons for stores and channel feeds.
- Template editor UI for updating field definitions and adding/removing attributes.
- Channel template update endpoint: `PATCH /api/channel-templates/[id]`.
- Product details modal popup from product list row click.
- Mapping modes: `FIELD`, `STATIC`, `COMBINE`, `LOOKUP`, `EXTRACT`, `EMPTY`.
- Mapping value-edit transformations:
  - overwrite
  - replace single / multiple
  - remove single / multiple
  - remove duplicates
  - strip HTML
  - add prefix / suffix
  - recalculate
  - recapitalize
  - round
- Rule action `include_product` alongside `exclude_product`.
- Post-mapping UX step to continue directly into include/exclude rule setup.
- Auth/UI branding refresh to **BFL Feed Management Tool** with BFL logo + BFL color theme.
- Login/auth left-panel visual redesign with branded artwork and improved composition.

### Changed
- Store API now supports XML sync settings on create/update.
- Store details and list pages now expose XML sync status and management controls.
- Channel feed pages now expose feed XML URL and deletion actions.
- Channel feed model now includes a unique public token for stable XML URLs.
- XML URL sync now also updates channel feed source references and auto-runs channel feed generation (scores/validation refreshed automatically).
- Main sidebar navigation simplified by removing top-level `Mapping`, `Rules`, `Validation`, and `Preview` entries.
- Global app styling aligned to BFL visual language (yellow/black/white feel across internal pages).

### Fixed
- Applied a safe one-time database backfill for existing channel feeds so `publicToken` is populated before enforcing non-null uniqueness.

