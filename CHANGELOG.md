# Changelog

All notable changes to this project are documented in this file.

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

