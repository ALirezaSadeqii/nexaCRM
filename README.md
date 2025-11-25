## NexaCRM

CRM-style dashboard built with Next.js App Router + Supabase auth/DB.

---

## 1. Prerequisites

- Node.js 18+
- npm 9+ (Yarn/PNPM also work)
- A Supabase project (free tier is fine)
- Optional: GitHub CLI if you plan to deploy to Pages

---

## 2. Configure Supabase (one-time)

1. Create a new project at [app.supabase.com](https://app.supabase.com/).
2. In the SQL editor, run the schema files in this repo in the following order (they’re all in the repo root):
   1. `users_table_schema.sql`
   2. `companies_only_schema.sql`
   3. `contacts_companies_relationship.sql`
   4. `activities_table_schema.sql`
   5. `add_company_relationship.sql`
3. Apply the RLS policy scripts:
   - `users_rls_policies.sql`
   - `activities_rls_policies.sql`
   - `deals_rls_policies.sql`
   - `supabase_policies.sql`
4. Seed a test user so you can log in:
   ```sql
   insert into auth.users (id, email, encrypted_password)
   values (gen_random_uuid(), 'demo@nexa.dev', crypt('demo-password', gen_salt('bf')));
   ```
   Or create a user via Supabase Auth “Users” tab using the same email/password you intend to sign in with.

---

## 3. Local Environment

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template and fill in your Supabase project URL + anon key (Settings → API):
   ```bash
   cp env.example .env.local
   # then edit .env.local
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```
4. Visit `http://localhost:3000`, log in with the Supabase user you created earlier.

> The app will crash on boot if Supabase env vars are missing, so new contributors immediately know what to fix.

---

## 4. Security Notes

- `.gitignore` blocks `.env*`, build folders, and OS cruft to keep secrets local.
- Only place the **public anon key** in `.env.local`. Service role keys must never touch the frontend.
- If a secret ever gets committed, rotate it in Supabase and force-push a history cleanup if needed.

---

## 5. GitHub Pages Deployment

`next.config.js` is set to `output: 'export'`, so builds are fully static.

1. Build:
   ```bash
   npm run deploy
   ```
   Output goes to `out/`.
2. (Optional) ensure `_next` assets are served:
   ```bash
   touch out/.nojekyll
   ```
3. Push the static folder to a `gh-pages` branch:
   ```bash
   git subtree push --prefix out origin gh-pages
   # or create a new branch containing only the contents of out/
   ```
4. Configure the repo’s Pages settings to serve from that branch (root).

---

## 6. Useful Scripts

| Command          | Description                         |
| ---------------- | ----------------------------------- |
| `npm run dev`    | Start local dev server               |
| `npm run lint`   | ESLint checks                        |
| `npm run build`  | Static export into `out/`            |
| `npm run deploy` | Alias for `next build` (GitHub Pages prep) |

---

## 7. Hardening Checklist

- Review the SQL policy files whenever schema changes are made.
- Add automated tests (Playwright/Cypress) to protect critical flows.
- Use HTTPS-only cookies if/when server-side auth is introduced.
- Before showcasing publicly, rotate Supabase anon keys if they were ever stored in Git history.
