# BFL Feed Management Tool

A multi-tenant SaaS for product feed management — import **CSV or XML** product feeds, map fields to channel templates (Google, Meta, TikTok, Microsoft, Custom), apply transformations, validate, preview and export to CSV/XML.

> Original implementation. Not affiliated with any commercial product.

## Stack

- **Next.js 14** (App Router) + **TypeScript** (strict)
- **Tailwind CSS** + **shadcn/ui**-style components
- **Prisma ORM** + **PostgreSQL** (Railway)
- **Redis** + **BullMQ** (Railway) — background processing
- **NextAuth** (Credentials provider, email/password)
- **PapaParse** (CSV), **xml2js** (XML)
- **Zod** + **React Hook Form** + **TanStack Table**

## Features

- Email/password auth with org-based multi-tenancy
- Stores per platform (Shopify / WooCommerce / Custom)
- **Source feed import — CSV and XML** (RSS 2.0 / Google Shopping XML / generic `<products><product>…</product></products>` / Atom-like feeds). Format auto-detected from filename + content; namespaces stripped (`g:price` → `price`); largest array of element nodes is treated as the product list.
- Product catalog with search, store + availability filters, pagination
- Channel templates seeded for Google, Meta, TikTok, Microsoft, Custom
- Field mapping — direct, static value, or combine multiple source fields with a separator
- Rule engine — operators `equals` / `contains` / `greater_than` / `less_than` / `is_empty` / `regex`, actions `set_value` / `append_text` / `prepend_text` / `replace` / `exclude_product` / `assign_custom_label`
- Validation — required fields, price format, URL validity, length warnings, 0–100 score
- Preview with **Transformed / Source / Diff** tabs; diff highlights changed cells per product
- Export to CSV and XML (RSS 2.0 / Google Shopping–style)
- Duplicate channel feed configs across channels in one click
- Store-level XML feed URL sync with user-selected cadence (**hourly / daily / weekly**)
- Automatic XML sync processing in worker (imports latest products, stock, and field updates)
- Automatic channel-feed refresh after XML sync (updates source feed link + regenerates validation/score)
- Manual "Sync now" trigger for store XML URL ingestion
- Delete actions in UI for stores and channel feeds
- Editable channel templates (update schema and add/remove attributes)
- Stable public XML URL per channel feed (`/api/public/channel-feeds/[token]/feed.xml`) that always renders latest data
- Product details popup modal from products table row click
- Mapping modes: **Use, Add static value, Combine, Use lookup table, Extract from, Leave empty**
- Post-mapping value edit transformations: overwrite, replace single/multiple, remove single/multiple, remove duplicates, strip HTML, add prefix/suffix, recalculate, recapitalize, round
- Explicit rule actions for both `include_product` and `exclude_product`
- Mock AI module (`/api/ai/suggest`) — title/category/labels suggestions, deterministic, no external calls

## Quick start (local)

```bash
# 1. install deps
npm install

# 2. configure env
cp .env.example .env
# fill DATABASE_URL, DIRECT_URL, REDIS_URL (optional), NEXTAUTH_SECRET, NEXTAUTH_URL, APP_URL

# 3. database
npm run prisma:generate
npx prisma db push

# optional demo data
npm run prisma:seed

# 4. dev server
npm run dev

# 5. (optional) scheduled XML URL sync from store settings — run in a second terminal:
npm run xml-sync-scheduler
```

The seed creates a demo org, one store, 20 sample products, all five channel templates (Google, Meta, TikTok, Microsoft, Custom), one Google channel feed mapped + 3 sample rules.

Notes:
- The seed **does not print demo credentials** by default. Set `SHOW_DEMO_CREDENTIALS=true` when running it if you want them printed locally.
- If you only need channel templates (not full demo data), go to **Templates** and click **Create default templates**.

### Optional: BullMQ worker

If `REDIS_URL` is set, you can also run the background worker for `feed-processing` jobs:

```bash
npm run worker
```

Synchronous generation via `POST /api/channel-feeds/[id]/generate` works without Redis; the worker just lets you offload long-running runs.

**Scheduled XML URL sync** (hourly / daily / weekly per store) runs in a **small sidecar process** that polls every minute, checks which stores are due, fetches the XML, updates products, and regenerates channel feeds.

- **Local development:** run `npm run dev` **and**, in a second terminal, `npm run xml-sync-scheduler` (same `.env` / database as the app). Without the scheduler process, only **Sync now** on the store page will refresh XML.
- **Production (Railway):** the default `start:web+xml` command (see `railway.json`) starts both `next start` and `xml-sync-scheduler` in one deploy, so schedules work without a separate Redis worker.

The **BullMQ worker** (`npm run worker`, requires `REDIS_URL`) is only for queued channel-feed generation jobs, not for this XML schedule.

## Railway deployment

1. Create a new Railway project.
2. Provision **PostgreSQL** plugin (required) and **Redis** plugin if you want the worker (optional for the app itself).
3. Create a service from this repo.
4. Set env vars from `.env.example`:
   - **Railway Postgres**:
     - Railway auto-provides `DATABASE_URL`
     - Set `DIRECT_URL` to the **same value** as `DATABASE_URL`
   - **Supabase Postgres (optional alternative)**:
     - `DATABASE_URL`: Supabase pooler URL (IPv4 recommended) or direct URL
     - `DIRECT_URL`: Supabase direct connection string (migrations/schema)
   - **Redis (optional)**: set `REDIS_URL` if running the worker.
   - **`NEXTAUTH_URL` and `APP_URL`**: set both to your **public** app URL (for example `https://your-service.up.railway.app`). Do **not** leave `localhost` here on Railway — it breaks auth redirects, sign-out, and public feed links even though the app is reachable on the platform URL.
   - **Still seeing the dashboard right after “sign out” or wrong redirect host?** The session cookie was probably not cleared (wrong `secure`/cookie name) or `NEXTAUTH_URL`/`APP_URL` still point at localhost. Use the real `https://…` Railway URL for both, redeploy, then try sign out again (or clear cookies once).
5. `railway.json` controls the lifecycle:
   - **build:** `npm ci && npm run build` (which runs `prisma generate && next build`)
   - **release/start:** `npx prisma db push && npm run start:web+xml` (starts Next.js and the XML sync scheduler; binds to `$PORT`; this repo does not ship `prisma/migrations`)
   - **healthcheck:** `GET /api/health`

The app is fully ephemeral-safe: uploaded files are parsed in memory and the parsed JSON is persisted to Postgres immediately. No local file storage anywhere.

## Process flow

```
Upload CSV / XML  →  parse → store rows as JSON
                    →  create Channel Feed
                    →  map fields (source → channel)
                    →  apply rules (conditions → actions)
                    →  validate (required, price, urls, lengths)
                    →  preview (transformed / source / highlighted diff)
                    →  export (CSV / XML)
```

## API

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/register` | Sign up — creates user + organization |
| `*` | `/api/auth/[...nextauth]` | NextAuth credentials |
| `GET` | `/api/health` | Healthcheck (used by Railway) |
| `GET/POST` | `/api/stores` | List + create stores |
| `GET/PATCH/DELETE` | `/api/stores/[id]` | Store detail / update / delete |
| `POST` | `/api/stores/[id]/sync` | Manual XML URL sync for a store |
| `POST` | `/api/source-feeds/upload` | Multipart upload, `format=auto\|csv\|xml` |
| `GET` | `/api/products` | Paginated, searchable, filterable |
| `GET/POST` | `/api/channel-templates` | List + create templates |
| `PATCH` | `/api/channel-templates/[id]` | Update template name/fields |
| `GET/POST` | `/api/channel-feeds` | List + create channel feeds |
| `GET/DELETE` | `/api/channel-feeds/[id]` | Detail / delete |
| `POST` | `/api/channel-feeds/[id]/duplicate` | Duplicate config (optionally to a different channel) |
| `PUT` | `/api/channel-feeds/[id]/mappings` | Replace field mappings |
| `PUT` | `/api/channel-feeds/[id]/rules` | Replace rules + conditions + actions |
| `POST` | `/api/channel-feeds/[id]/generate` | Materialize a validation result; mark `lastRunAt` |
| `GET` | `/api/channel-feeds/[id]/preview` | Live preview with diffs (no DB write) |
| `GET` | `/api/channel-feeds/[id]/validation` | Latest validation report |
| `GET` | `/api/channel-feeds/[id]/export.csv` | Download CSV |
| `GET` | `/api/channel-feeds/[id]/export.xml` | Download RSS-2.0 XML |
| `GET` | `/api/public/channel-feeds/[token]/feed.xml` | Stable public XML feed URL |
| `POST` | `/api/ai/suggest` | Mock title/category/label suggestions |

## Project layout

```
src/
  app/
    layout.tsx                provider wrapper
    page.tsx                  redirect → /login or /dashboard
    globals.css
    providers.tsx             NextAuth SessionProvider

    (auth)/login              email/password sign-in
    (auth)/register           sign up + creates org

    (app)/layout.tsx          authed shell + sidebar
    (app)/dashboard
    (app)/stores              + new + [id]
    (app)/stores/[id]/FeedUploader.tsx     CSV + XML upload UI
    (app)/products
    (app)/channel-feeds       + new + [id] + [id]/{mapping,rules,validation,preview}
    (app)/channel-templates
    api/...                   see API table above

  components/
    ui/                       (button, input, label, card, select, textarea, badge, table)
    DataTable.tsx             TanStack Table wrapper
    FieldMapper.tsx           advanced mapping editor + value transformations
    RuleBuilder.tsx           full conditions × actions editor (include/exclude support)
    FeedPreview.tsx           transformed / source / diff (with cell-level highlight)
    ValidationPanel.tsx
    ChannelFeedPicker.tsx     server component used by top-level /mapping etc.
    SignOutButton.tsx

  services/
    feedParser.ts             parseCSV + parseXML + detectFormat + parseFeed
    feedMapper.ts             mapping engine (FIELD/STATIC/COMBINE/LOOKUP/EXTRACT/EMPTY + value edits)
    ruleEngine.ts             rule engine with include/exclude and transform actions
    feedValidator.ts          required / url / price / length checks + 0–100 score
    feedExporter.ts           CSV (PapaParse) + XML (xml2js, RSS-2.0)
    feedHealthScore.ts        validation × coverage × freshness
    feedPipeline.ts           orchestrator used by API + worker
    ai.ts                     mock suggestions

  lib/
    auth.ts                   NextAuth credentials + JWT/session typing
    db.ts                     Prisma client singleton
    redis.ts                  IORedis singleton (lazy)
    queue.ts                  BullMQ queue helpers (no-op if no Redis)
    tenant.ts                 requireTenant / requireStore / requireChannelFeed
    api.ts                    jsonError helper (Zod / TenantError → JSON)
    utils.ts                  cn(), formatDate()

  workers/
    feed.worker.ts            BullMQ worker — runs the same pipeline async

  middleware.ts               auth-gates /dashboard, /stores, /products,
                              /channel-feeds, /channel-templates

prisma/
  schema.prisma               core models + enums for sync, mapping, rules, exports, jobs
  seed.ts                     demo org + 20 products + 5 templates + 3 rules
```

## Resume Work Later

To resume quickly in a future chat/session:

1. Start with `CHANGELOG.md` (latest day section first).
2. Review this README's **Features** and **Project layout** sections.
3. Run app locally:
   - `npm install`
   - `npm run prisma:generate`
   - `npx prisma db push`
   - `npm run dev`
   - `npm run worker` (for scheduled XML sync behavior)
4. Validate critical flows:
   - Store XML URL sync schedule + manual sync
   - Channel feed mapping + value edits + rules
   - Public XML URL output
   - Product details popup

These docs are now the source of truth for project scope and implemented functionality.

## Multi-tenancy

Every query is scoped through `requireTenant()` (extracts `organizationId` from the NextAuth session) and helpers like `requireStore(storeId, organizationId)` / `requireChannelFeed(channelFeedId, organizationId)`. There is no path that exposes another org's data.

## Environment variables

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (Railway plugin) |
| `REDIS_URL` | Optional. Enables BullMQ worker / queueing |
| `NEXTAUTH_SECRET` | Long random string |
| `NEXTAUTH_URL` | Public URL of the app |
| `APP_URL` | Public URL (used in callbacks/exports) |
| `NODE_ENV` | `development` / `production` |
| `PORT` | Provided by Railway; respected by `npm run start` |
