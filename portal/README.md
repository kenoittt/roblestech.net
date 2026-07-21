# Robles Tech — Client Portal

Gated per-client SEO dashboards. Astro (SSR) + Supabase (Auth, Postgres, private
Storage), deployed to Vercel at `portal.roblestech.net`. Separate from the
marketing site — it does not affect the GitHub Pages build.

## How it works
- Clients log in with credentials **you** issue (no self-signup).
- Each monthly report is a self-contained HTML file (the one Claude generates
  from GSC), stored in a **private** bucket.
- A client only ever sees **their own** reports — enforced by Postgres
  Row-Level Security *and* a server-side ownership check before any file is
  streamed. Report files never get a public/shareable URL.

## One-time setup

### 1. Supabase
1. In your project, open **SQL Editor → New query**, paste all of
   `supabase/schema.sql`, and run it. This creates the tables, the private
   `reports` bucket, and the RLS policies.
2. Get your keys from **Project Settings → API**:
   - `Project URL` → `PUBLIC_SUPABASE_URL`
   - `anon` / `publishable` key → `PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` / `secret` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)
3. Create your own admin login: **Authentication → Users → Add user** (set a
   password, tick "Auto Confirm"). Then in **SQL Editor** run:
   ```sql
   insert into public.profiles (id, role, full_name)
   values ('<your-new-user-id>', 'admin', 'Your Name');
   ```
   (Copy the user's id from the Users list.)

### 2. Local dev (optional)
```bash
cd portal
cp .env.example .env   # fill in the three keys
npm install
npm run dev
```

### 3. Vercel
1. Import this repo, set **Root Directory = `portal`**.
2. Add the three env vars from `.env.example` (Production + Preview).
3. Deploy.

### 4. GoDaddy DNS
Add a `CNAME`: host `portal` → value `cname.vercel-dns.com` (Vercel shows the
exact target when you add the custom domain `portal.roblestech.net`).

## Day-to-day (admin panel at `/admin`)
1. **Add a client company.**
2. **Create a client login** (email + password) linked to that company; share it.
3. **Publish a monthly report** — upload the HTML file (or paste it), pick the
   month. It appears in that client's dashboard immediately.
