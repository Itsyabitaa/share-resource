# md-nest

Markdown writing and sharing. Next.js 15 Pages Router, Neon PostgreSQL, Cloudinary, Better Auth.

## Features

- Editor and file upload (TXT, MD, DOCX)
- Public explore feed with search, tags, likes, comments
- Guest links expire in 3 days; free accounts get 30 days; Pro is permanent
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

### Google sign-in (optional)

1. Create an OAuth **Web application** in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Add authorized redirect URIs:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` in `.env.local` and Vercel.
4. Ensure `BETTER_AUTH_URL` matches the site origin (required for OAuth callbacks).

First-time Google sign-in creates an account automatically (same as email signup).

### Storage tiers

| Tier | Retention |
|------|-----------|
| Guest (no account) | 3 days |
| Free (signed in) | 30 days |
| Pro | Permanent |

Run `npm run db:setup` after pulling to add the `user.plan` column. Set `PRO_PROMO_CODE` or `ENABLE_SELF_SERVE_PRO=true` to allow upgrades from the pricing page.

### Admin (grant Pro)

1. Set `ADMIN_EMAILS=your@email.com` in `.env.local` and Vercel (comma-separated for multiple admins).
2. Sign in with that email.
3. Open **Account → Admin** or visit `/admin`.
4. Search users by email/name, or enter an email and choose **Pro** / **Free**.

Optional CLI (uses `ADMIN_SECRET`):

```bash
curl -X POST https://mdnest.vercel.app/api/admin/set-plan \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","plan":"pro"}'
```

## Scripts

- `npm run dev` / `build` / `start`
- `npm run db:setup` — safe schema apply
- `npm run type-check`

## License

MIT
