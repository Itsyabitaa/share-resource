# md-nest

Markdown writing and sharing. Next.js 15 Pages Router, Neon PostgreSQL, Cloudinary, Better Auth.

## Features

- Editor and file upload (TXT, MD, DOCX)
- Public explore feed with search, tags, likes, comments
- Guest links expire in 3 days; signed-in docs stay
- Folders, workspace, edit/delete your own files
- Optional custom Cloudinary credentials (encrypted)

## Setup

1. `npm install`
2. Copy `env.example` to `.env.local` and fill in values
3. `npm run db:setup` — **non-destructive**. Creates missing tables only.
4. `npm run dev`

Do **not** run `npm run migrate-fresh` on a database with data. It drops every table.

## Environment

See `env.example`. Production also needs:

- `BETTER_AUTH_URL` and `NEXT_PUBLIC_BETTER_AUTH_URL` set to the live origin
- `CLEANUP_CRON_SECRET` or Vercel `CRON_SECRET`

Password reset and OAuth need extra Better Auth email/provider config and are not enabled by default.

## Scripts

- `npm run dev` / `build` / `start`
- `npm run db:setup` — safe schema apply
- `npm run type-check`

## License

MIT
