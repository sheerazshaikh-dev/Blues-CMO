# Blues CMO Founding Preview

Original founding presentation, preserved as the root HTML page, with cloud-backed form submissions and a private admin dashboard.

## Stack

- Static original HTML/CSS/JavaScript presentation
- Vercel Node.js serverless API routes (no install/build dependencies)
- Bluescmo Supabase PostgreSQL with RLS
- Supabase Auth email/password for a single allowed administrator

## Deploy to Vercel

1. Import `sheerazshaikh-dev/Blues-CMO` in Vercel, Framework Preset **Other**. No build command and no output directory required.
2. Set environment variables from `.env.example` for Production and Preview, replacing placeholder values. `SUPABASE_SECRET_KEY` is a **server-side** Supabase secret/service-role key, never `NEXT_PUBLIC_`.
3. Set `ADMIN_EMAIL` to the administrator's exact email.
4. In Bluescmo Supabase Dashboard → Authentication → Users → Add user, create a password-based account with that exact email, with email confirmed. Avoid sharing the password in GitHub or Vercel variables.
5. Redeploy after adding environment variables.

Presentation: `/`. Admin login: `/admin/login`. Entries: `/admin`.

## Data and security

The database table `public.founding_sessions` is created with RLS and no anon/authenticated grants. API server uses the server-only key for storage. Admin login goes through Supabase Auth and only the exact `ADMIN_EMAIL` is authorized. API checks admin identity every time entries are requested. A same-origin check prevents cross-site form posts. The frontend receives neither the DB secret key nor user tokens. Existing browser backups remain as a convenience, not as the source of truth.

Each saved session is upserted by a stable UUID, preventing duplicates when Save is clicked again. All feature ratings, pricing feedback, survey answers and notes are stored in `payload` JSONB along with indexed top-level metadata.

## Verification checklist

- Open presentation; complete a session with an owner/business name; Save session.
- Verify success message and corresponding row in Supabase Table Editor.
- Visit `/admin` signed out: redirected to login.
- Sign in with the allowed Supabase Auth user; confirm the entry and expand full answers; test search, pagination and CSV download.
- Wrong user login must be rejected and `/api/admin-entries` without a cookie must return 401.
- Log out; admin entries must no longer be available.

### Operational note

The submission endpoint is intended for **presenter-operated sessions**. For a public high-traffic form, add bot mitigation and durable per-IP rate limiting before opening it to anonymous visitors.
