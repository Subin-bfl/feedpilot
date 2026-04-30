# FeedPilot

A multi-tenant SaaS for product feed management — import **CSV or XML** product feeds, map fields to channel templates (Google, Meta, TikTok, Microsoft, Custom), apply rule-based transformations, validate, preview and export to CSV/XML.

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
- Mock AI module (`/api/ai/suggest`) — title/category/labels suggestions, deterministic, no external calls

## Quick start (local)

```bash
# 1. install deps
npm install

# 2. configure env
cp .env.example .env
# fill DATABASE_URL, REDIS_URL (optional), NEXTAUTH_SECRET, NEXTAUTH_URL, APP_URL

# 3. database
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# 4. dev server
npm run dev
```

Demo login (after seed):

```
email:    demo@feedpilot.dev
password: demo1234
```

The seed creates a demo org, one store, 20 sample products, all five channel templates (Google, Meta, TikTok, Microsoft, Custom), one Google channel feed mapped + 3 sample rules.

### Optional: BullMQ worker

If `REDIS_URL` is set, you can also run the background worker for `feed-processing` jobs:

```bash
npm run worker
```

Synchronous generation via `POST /api/channel-feeds/[id]/generate` works without Redis; the worker just lets you offload long-running runs.

## Railway deployment

1. Create a new Railway project.
2. Provision **PostgreSQL** and **Redis** plugins (Redis is optional for the app itself; required only for the worker).
3. Create a service from this repo.
4. Set env vars from `.env.example` — Railway auto-fills `DATABASE_URL` / `REDIS_URL` if you reference the plugins.
5. `railway.json` controls the lifecycle:
   - **build:** `npm ci && npm run build` (which runs `prisma generate && next build`)
   - **release/start:** `npx prisma migrate deploy && npm run start` (binds to `$PORT`)
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
| `GET/DELETE` | `/api/stores/[id]` | Store detail / delete |
| `POST` | `/api/source-feeds/upload` | Multipart upload, `format=auto\|csv\|xml` |
| `GET` | `/api/products` | Paginated, searchable, filterable |
| `GET/POST` | `/api/channel-templates` | List + create templates |
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
    (app)/mapping             top-level — feed picker → /channel-feeds/[id]/mapping
    (app)/rules               top-level — feed picker → /channel-feeds/[id]/rules
    (app)/validation          top-level — feed picker → /channel-feeds/[id]/validation
    (app)/preview             top-level — feed picker → /channel-feeds/[id]/preview

    api/...                   see API table above

  components/
    ui/                       (button, input, label, card, select, textarea, badge, table)
    DataTable.tsx             TanStack Table wrapper
    FieldMapper.tsx           direct / static / combine mapping editor
    RuleBuilder.tsx           full conditions × actions editor
    FeedPreview.tsx           transformed / source / diff (with cell-level highlight)
    ValidationPanel.tsx
    ChannelFeedPicker.tsx     server component used by top-level /mapping etc.
    SignOutButton.tsx

  services/
    feedParser.ts             parseCSV + parseXML + detectFormat + parseFeed
    feedMapper.ts             FIELD / STATIC / COMBINE
    ruleEngine.ts             6 operators × 6 actions
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
                              /channel-feeds, /channel-templates,
                              /mapping, /rules, /validation, /preview

prisma/
  schema.prisma               15 models incl. enums for platform/channel/operator/action/format/status
  seed.ts                     demo org + 20 products + 5 templates + 3 rules
```

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
