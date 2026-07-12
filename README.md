# מדריך התמחות בילדים — Pediatric Residency App

Mobile-first PWA reference guide for pediatric residents, with a no-code
admin CMS for department managers. See `.claude/plans/` (or ask Claude) for
the original architecture plan.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, Supabase (Postgres, Auth,
Storage), Serwist (offline PWA), TipTap (rich text), react-pdf (inline PDF
viewer), Web Push for update notifications.

## One-time setup

1. **Install dependencies**

   ```bash
   npm install
   ```

   This also copies the pdf.js worker into `public/` (see
   `scripts/copy-pdf-worker.mjs`).

2. **Create a Supabase project**

   - Go to [supabase.com](https://supabase.com), create a free project.
   - In the SQL Editor, run the four files in `supabase/migrations/` **in
     order** (0001, 0002, 0003, then optionally 0004 for a worked demo
     page). Each file explains what it does in its header comment.
   - In Project Settings → API, copy the **Project URL**, **anon public**
     key, and **service_role** key.

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

   - Run the app (`npm run dev`), go to `/login`, and sign up normally —
     every new signup starts as a `resident` (see the `handle_new_user`
     trigger in `0001_init_schema.sql`).
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
