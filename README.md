## NexaCRM

Simple CRM-style dashboard built with the Next.js App Router and Supabase authentication.

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `env.example` to `.env.local` and add your Supabase Project URL and anon key:
   ```bash
   cp env.example .env.local
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Visit `http://localhost:3000`.

> Environment variables are validated at runtime. The app will throw a helpful error if you forget to configure them.

## Security & Secrets

- `.gitignore` already excludes `.env*`, build artifacts, and OS cruft so secrets stay local.
- Never commit your Supabase service role key—only the anon key belongs in `.env.local`.
- Rotate your Supabase anon key if it was ever committed in earlier history.
- Before pushing, run `git status --ignored` to ensure no hidden files are staged.

## GitHub Pages Deployment

The project is configured for static export (`next.config.js` sets `output: 'export'`).

1. Build the static bundle:
   ```bash
   npm run deploy
   ```
   The static files land in `out/`.
2. (Optional) add `out/.nojekyll` so GitHub Pages serves files that start with `_`:
   ```bash
   touch out/.nojekyll
   ```
3. Push the contents of `out/` to a `gh-pages` branch:
   ```bash
   git subtree push --prefix out origin gh-pages
   # or manually copy the folder into a dedicated branch
   ```
4. In the repo settings, point GitHub Pages at the `gh-pages` branch (root).
5. If you host under `https://username.github.io/repo`, make sure to update links or set `homepage` in `package.json` so social previews display correctly.

## Useful Scripts

| Command        | Description                                |
| -------------- | ------------------------------------------ |
| `npm run dev`  | Start local dev server                     |
| `npm run lint` | Lint the project                           |
| `npm run build`| Produce the static export in `out/`        |
| `npm run deploy`| Build + prepare assets for GitHub Pages  |

## Additional Hardening Ideas

- Review Supabase Row Level Security (RLS) policies before going live (`*.sql` files in the repo document them).
- Use HTTPS-only cookies for any future server-side auth work.
- Add end-to-end/browser tests before showcasing to recruiters.
