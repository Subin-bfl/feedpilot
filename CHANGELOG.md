# Changelog

All notable changes to this project are documented in this file.

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

