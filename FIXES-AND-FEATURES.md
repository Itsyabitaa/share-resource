# mdNest — Fixes and Features

Review of the current Pages Router app (`mdnest`). Items are ordered so security and data-integrity work comes first, then incomplete product behavior, then new features.

**Do not run `npm run migrate-fresh`.** That script drops every table. Schema work should be additive only.

---

## P0 — Must fix (security and broken access)

Status: implemented in code (private/expiry access checks, no `rehype-raw`, Supabase client removed, cleanup secret required in production, auth origins from env/Vercel).

### 1. Private files are public
`/file/[id]` loads any file by UUID. `getFileById` does not check `is_public`, owner, or `expires_at`. Anyone with (or guessing) a link can read a “private” document.

**Fix:** Gate `getServerSideProps` (and comments/likes APIs) so that:
- public files are readable by anyone
- private files are readable only by the owner
- expired guest files return 404 and are not served from Cloudinary

### 2. XSS via raw HTML in markdown
The file viewer uses `rehype-raw`, so stored markdown can inject scripts/HTML.

**Fix:** Drop `rehype-raw`, or sanitize HTML (e.g. `rehype-sanitize`) before render.

### 3. Hardcoded unused Supabase credentials
`lib/supabaseClient.ts` is unused and contains a live project URL + anon key.

**Fix:** Delete the file and remove `@supabase/supabase-js` from `package.json`.

### 4. Cleanup endpoint can wipe expired files with no secret
If `CLEANUP_CRON_SECRET` is unset, `/api/cleanup` accepts any POST.

**Fix:** Require the secret in production. Add the cron to `vercel.json`. Never delete DB rows if Cloudinary delete failed unless that is explicit.

### 5. Auth will fail in production
`lib/auth.ts` `trustedOrigins` is only `http://localhost:3000`. `BETTER_AUTH_URL` defaults to localhost.

**Fix:** Include the real site origin (and `www` if used). Set `BETTER_AUTH_URL` per environment.

### 6. Internal errors leak to clients
Several APIs return `details: err.message` (save, convert, comments, likes, explore, credentials).

**Fix:** Log server-side; return a generic message to the client.

---

## P1 — Product bugs (features that look done but are not)

### 7. Custom Neon URL is stored and never used
Settings let users save a Neon URL. Uploads still always write to the shared `DATABASE_URL`. Only Cloudinary can actually switch.

**Fix:** Either wire a per-user Neon client (hard, and file pages would need to know which DB) **or** remove the Neon field and only support custom Cloudinary.

### 8. Shared Cloudinary config is mutated globally
`getCloudinaryInstance` calls `cloudinary.config(...)` on the singleton. Concurrent users can overwrite each other’s credentials.

**Fix:** Create an isolated Cloudinary SDK instance per request, or pass config into `uploader.upload` without mutating globals.

### 9. `/api/convert` saves the wrong record
File upload converts **and immediately inserts** a DB row that:
- has no `user_id` (not owned by the logged-in user)
- has no `expires_at` (guest files never expire)
- ignores public/hashtags/folder
- then the editor still asks the user to Share, which creates a **second** file

DOC/DOCX are also read as UTF-8, which produces garbage.

**Fix:** Convert in memory only (return `content` + suggested title). Persist once on Share. Parse DOC/DOCX with `mammoth` (or drop those types until then).

### 10. Expired guest files still open
Expiry is only enforced if cleanup cron runs. Viewing does not check `expires_at`.

**Fix:** Reject expired files in `getFileById`. Keep cron as garbage collection, not as the access control.

### 11. Comments show raw `user_id`
No join to `"user".name`. Authors look like UUIDs/text ids.

**Fix:** Join comments to `"user"` and return `author_name` (and avatar later).

### 12. Schema helpers do not match the real DB
`lib/dbSchema.ts` `createTables()`:
- types `files.user_id` as `UUID` (Better Auth uses `TEXT`)
- never creates `folders`, `likes`, or `comments`

`scripts/setup-db.ts` therefore cannot create a working schema. The only complete script is destructive `migrate-fresh`.

**Fix:** Add a **non-destructive** `npm run db:setup` / `db:migrate` that `CREATE TABLE IF NOT EXISTS` + indexes only. Align types with `migrate-fresh.js`.

### 13. Duplicate / dead UI
- `CommentSection` and `LikeButton` exist but `/file/[id]` reimplements both (~900 lines)
- `AuthModal` is unused
- `getSocialStats` is imported on the file page and never used
- `getAllFiles()` returns every file including private ones (dangerous if ever wired up)

**Fix:** Use the shared components, delete dead code, remove `getAllFiles` or hard-filter to the current user.

### 14. Login ignores `?redirect=`
Comment flow sends users to login with a redirect param; login always goes home.

**Fix:** After sign-in, honor a same-origin `redirect` query.

### 15. Explore search fires on every keystroke
No debounce. Also searches title/author only, not body or hashtags text.

**Fix:** Debounce ~300ms. Add pagination (`LIMIT`/`OFFSET` or cursor). Optional full-text later.

### 16. Folders are incomplete
Can create/delete folders and assign on create. Cannot:
- rename a folder
- move an existing file
- delete a file
- see files in a folder as a real workspace view (sidebar lists them, but the main page does not change)

**Fix:** Folder rename + move + delete-file APIs, and a folder view on the home/workspace page.

### 17. Build / lockfile noise
Next warns about `C:\Users\Kuku Sha\Desktop\bun.lock` vs `package-lock.json`. `auth.ts` still constructs a `pg` `Pool` at import time (same class of build-time env issue as Neon had).

**Fix:** One lockfile. Lazy-init the Better Auth pool the same way as `neonClient`.

---

## P2 — Features to add (high value)

### 18. Edit after publish
Authors cannot update title, markdown, public flag, hashtags, or folder.

**Add:** `PATCH /api/files/[id]` (owner only) + an Edit button on the file page that reuses the editor.

### 19. Delete own documents
No delete API. Cloudinary objects are orphaned forever except expired guests.

**Add:** Owner-only delete: Cloudinary destroy + DB row. Confirm in UI.

### 20. Download / copy markdown
View page has copy-link only.

**Add:** Copy raw markdown + Download `.md`.

### 21. Workspace file list
Logged-in home is “create”, not “my docs”. Sidebar is the only inventory.

**Add:** A My Documents view (all / by folder) with search, public badge, expiry badge, edit/delete.

### 22. Guest UX on share
Warn before share that the link dies in 3 days. Show remaining time on the file page for guest docs.

### 23. Rate limits
Unauthenticated `/api/save` and `/api/convert` can burn Cloudinary/Neon quota.

**Add:** Per-IP limits on save/convert/explore; stricter limits on comments/likes.

### 24. Email verification + password reset
Tables exist; Better Auth email flows are not configured. No “forgot password”.

### 25. OAuth (Google / GitHub)
`account` table exists; only email/password is enabled.

---

## P3 — Nice to have

| Feature | Notes |
|---|---|
| Nested folders | Parent `folder_id` on `folders` |
| Document versions | Snapshot on each edit |
| Pin / star in workspace | Separate from public likes |
| Sort explore | New / most liked / most commented |
| Table of contents | From markdown headings on view page |
| Syntax highlighting | `rehype-highlight` or similar |
| Share to X / copy as rich text | Beyond raw URL |
| Image upload in editor | Cloudinary images, markdown `![]()` |
| Collaborative editing | README claims this; it is not built |
| Dark/light per-document | Independent of app theme |
| Tests | Zero tests today; start with API access-control tests |
| ESLint | `npm run lint` exists; no eslint config/deps |
| Pin React version | `"react": "latest"` is unsafe |
| Replace inline styles | CSS modules or one UI kit; file page is too large |
| Pagination + indexes | Explore and comments will get slow |
| `next.config` `images.domains` | Deprecated; use `remotePatterns` |

---

## Docs and repo cleanup

README is wrong in several places. Correct when touching docs:

- Next.js **15** Pages Router, not 14 App Router
- No Kysely, no Marked.js — Neon SQL tagged templates + `react-markdown`
- No real-time collaboration
- `env.example` is the file, not `.env.example`
- `migrate-fresh` is destructive; do not list it as the default setup step
- Add a safe setup script instead

Also remove unused deps if confirmed unused: `multer`, `@types/multer`, `@supabase/supabase-js`.

---

## Suggested implementation order

Work in this sequence so each slice is shippable without wiping data:

1. Access control on file view + social APIs + expiry check  
2. Remove XSS (`rehype-raw`) and hardcoded Supabase  
3. Convert-in-memory only; persist on Share; real DOC/DOCX or drop types  
4. Comment author names; use `CommentSection` / `LikeButton`  
5. Edit + delete own files; folder rename + move  
6. Custom storage: isolate Cloudinary; drop or actually use custom Neon  
7. Explore debounce + pagination; My Documents view  
8. Production auth origins, cleanup cron + required secret  
9. Non-destructive DB migrate script; README truth-up  
10. Rate limits, download/copy, then P3 items  

---

## Out of scope / do not do

- Do not drop or recreate tables to “fix” schema  
- Do not commit `.env.local` or real API keys  
- Do not enable custom Neon writes until file reads know which database to query
