# מדריך התמחות בילדים — Pediatric Residency App

Mobile-first PWA reference guide for pediatric residents, open to anyone
with the link (no account needed), with a no-code admin CMS for department
managers at `/admin`. See `.claude/plans/` (or ask Claude) for the original
architecture plan.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, Supabase (Postgres, Auth,
Storage), Serwist (offline PWA), TipTap (rich text), native `<iframe>` for
inline PDF viewing, Web Push for update notifications.

## One-time setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project**

   - Go to [supabase.com](https://supabase.com), create a free project.
   - In the SQL Editor, run every file in `supabase/migrations/` **in
     numeric order** (0001 through the highest-numbered file present).
     Each file explains what it does in its header comment; 0004 is an
     optional worked demo page and can be skipped.
   - In Project Settings → API, copy the **Project URL**, the
     **publishable/anon** key, and the **secret/service_role** key (newer
     Supabase projects label these "Publishable key" / "Secret key"
     instead of the legacy "anon" / "service_role" names — either works
     the same way here).
   - In Authentication → Sign In / Providers, **enable Anonymous
     Sign-ins**. This is required: residents browse the app without an
     account, and the app silently gives each visitor a lightweight
     anonymous session (see `lib/supabase/middleware.ts`) so Row Level
     Security and push-notification subscriptions keep working. Without
     this toggle, resident-facing pages will load empty.

3. **Configure environment variables**

   ```bash
   cp .env.local.example .env.local
   ```

   Fill in the three Supabase values from step 2. VAPID keys for push
   notifications can be generated with:

   ```bash
   npx web-push generate-vapid-keys
   ```

   (`VAPID_SUBJECT` should be a `mailto:` address you control.)

4. **Create your first admin account**

   - Run the app (`npm run dev`), go to `/login` (only reachable
     directly — there's no signup prompt anywhere in the resident-facing
     app, since browsing needs no account), and sign up. Every new
     signup starts as a `resident` (see the `handle_new_user` trigger in
     `0001_init_schema.sql`).
   - In the Supabase SQL Editor, promote yourself:
     ```sql
     update public.profiles set role = 'admin' where id =
       (select id from auth.users where email = 'you@example.com');
     ```
   - This manual step is deliberate — there's no self-serve admin signup.

5. **Run it**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## What's here

- **Resident-facing app** (`app/(resident)/`): home grid of sections,
  generic pages with a block-based page builder (rich text, images, PDFs
  with download buttons, nested tabs, external-link buttons, and
  admin-configurable data tables), plus a header search icon that searches
  page titles *and* content, scoped to everywhere / the current category /
  the current page.
- **Medications section** (`components/medications/`,
  `app/admin/medications` via the generic `[sectionSlug]` route): a
  dedicated structured system, not the generic page builder — category
  tabs in a row, collapsed/expandable drug rows, and a fully
  admin-configurable field schema (text/number/number-range/select). See
  `supabase/migrations/0008_medications.sql`. Any section can opt into
  this by setting `sections.section_type = 'medications'`.
- **Admin CMS** (`app/admin/`): page builder and publishing
  (`lib/actions/admin.ts`), branding/theme controls at `/admin/settings`,
  bulk select + delete/move for pages, and confirm dialogs
  (`components/ConfirmDialog.tsx`) + toasts (`components/Toast.tsx`) on
  every destructive action.

## Notes

- `npm run dev` / `npm run build` explicitly pass `--webpack`: the offline
  service worker (`@serwist/next`) doesn't support Turbopack yet, and
  Next.js 16 defaults to Turbopack otherwise.
- The service worker is disabled in development (see `next.config.ts`) so
  it doesn't fight with Fast Refresh. Offline behavior can only be tested
  against a production build: `npm run build && npm run start`.
- Admins manage content at `/admin` (link appears in the drawer for admin
  accounts only). See `lib/actions/admin.ts` and `components/editor/` for
  how the page builder works.
