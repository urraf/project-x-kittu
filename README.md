# Life of KittuKun

The personal brand and storytelling website for **Chitranshu Rajput** and his YouTube channel [Life of KittuKun](https://www.youtube.com/@lifeofkittukun). It covers international internships, scholarships, Japan, Korea, Europe and the journey in between.

- **Public site:** cinematic homepage, Journey timeline, video library with watch pages, an editorial blog and a Collaborate page.
- **Studio (`/admin`):** a private dashboard for blog posts, images, videos, journey chapters, messages, site copy and the AI writer.
- **AI:** Groq-powered drafts in the creator's voice, plus a secured endpoint an external cron service calls to generate and publish posts automatically.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, MongoDB (Mongoose), TipTap and sharp.

---

## Quick start (local)

```bash
npm install
cp .env.example .env.local          # skip if .env.local already exists
npm run secrets                     # prints AUTH_SECRET and CRON_SECRET values
npm run admin:hash-password         # sets ADMIN_PASSWORD_HASH (written into .env.local)

# Terminal 1: local MongoDB (no install; data kept in ./.data). Or use an Atlas URI instead.
npm run db:local

# Terminal 2
npm run seed                        # optional: starter journey, videos and 3 articles
npm run dev                         # http://localhost:3000
```

If `MONGODB_URI` is missing or the database is unreachable, the public site still renders with fallback content and logs one `config.missing` warning.

Sign in at **http://localhost:3000/admin**. There is deliberately no link to it anywhere on the public site.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | ✅ | MongoDB connection string (Atlas free tier works). |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Public URL, used for SEO, sitemap and Open Graph. |
| `AUTH_SECRET` | ✅ | ≥32 chars. Signs admin sessions and captcha tokens. |
| `ADMIN_PASSWORD_HASH` | ✅ (first run) | The **starting** admin password, as a scrypt hash from `npm run admin:hash-password`. It is copied into MongoDB on the first successful login; after that the database copy is used and the admin changes it in **Settings → Login & password**. |
| `ADMIN_EMAIL` | – | Optional starting login email. The admin can set or change the email in **Settings → Login & password**; until an email exists, login is password-only. |
| `CRON_SECRET` | for automation | ≥24 chars. Your cron service sends it as a Bearer token. |
| `GROQ_API_KEY` | for AI | From console.groq.com. |
| `GROQ_MODEL` | – | Default `openai/gpt-oss-120b`. Any chat model your Groq account lists works. |
| `GROQ_REASONING_EFFORT` | – | `low` (default) / `medium` / `high` for gpt-oss models. |
| `YOUTUBE_API_KEY` | – | Full channel sync with durations. Without it, the public RSS feed is used. |
| `YOUTUBE_CHANNEL_ID` | – | Defaults to the Life of KittuKun channel. |
| `UNSPLASH_ACCESS_KEY` | – | Stock-photo covers for AI posts. Otherwise video thumbnails or branded covers are used. |
| `MAX_UPLOAD_MB` | – | Image upload limit (default 8). |

All secrets are read server-side only (`src/lib/env.ts` is `server-only`). Only `NEXT_PUBLIC_SITE_URL` reaches the browser.

---

## Deploying (Vercel + MongoDB Atlas)

1. Create a MongoDB Atlas cluster and a database user. Allow network access from your host (Vercel: `0.0.0.0/0`, or use Atlas's Vercel integration).
2. Import the repo into Vercel and add the environment variables above (Production + Preview).
3. Deploy, then run the seed once from your machine against the production database if you want the starter content: `MONGODB_URI=… npm run seed`.
4. Open `/admin` and go to **Videos → Sync from YouTube** to pull the latest uploads.

Images are stored in MongoDB GridFS, so no extra storage service is needed and the app runs on any Node host (Vercel, Render, Railway, a VPS with `npm run build && npm start`). Node ≥ 20.9.

Health check: `GET /api/health` returns `200` when the database is reachable.

---

## Automated blog posts (external cron)

The app intentionally has **no internal scheduler**. Point any cron service (cron-job.org, EasyCron, GitHub Actions, Upstash QStash…) at:

```
POST https://YOUR-DOMAIN/api/automation/generate-post
Authorization: Bearer <CRON_SECRET>
```

Example: cron-job.org, daily at 09:00 IST, method **POST**, header `Authorization: Bearer …`, request timeout **≥ 120 s**.

```bash
curl -X POST "https://YOUR-DOMAIN/api/automation/generate-post" \
  -H "Authorization: Bearer $CRON_SECRET"
```

**What each call does:** authenticate → check the automation switch → acquire the run lock → apply publishing rules (max per day, minimum hours between posts) → pick the least-recently-covered topic → plan the article (JSON) → write it (Markdown) → clean, validate length/structure and reject near-duplicate titles → prepare a cover → sanitise and save → publish or draft, per settings → log the run.

**Optional JSON body:** `{ "topic": "…", "category": "Japan", "keywords": ["mext"], "publish": false, "dryRun": true, "force": true }`. `force` bypasses the schedule rules (not the lock).

**Idempotency:** send an `Idempotency-Key` header, or rely on the default key (one per IST day-slot). A retried call with the same key returns `200 {"status":"duplicate"}` and never creates a second post. A database-level lock guarantees only one run at a time.

| Status | Meaning |
| --- | --- |
| `201` | Post created (`status: "published"` or `"drafted"`) |
| `200` | `skipped` (rules/disabled), `duplicate` (already processed) or `dry_run` |
| `401` | Missing or wrong secret (repeated failures from one IP → `429`) |
| `409` | Another run is in progress |
| `502` | AI provider error, or the generated content failed validation |
| `503` | Not configured (`CRON_SECRET` / `GROQ_API_KEY` missing) |

Every run, including skips and failures, is visible in **Studio → AI writer → Run history**.

---

## Studio guide (for the creator)

| Section | What you can do |
| --- | --- |
| **Dashboard** | Post counts, recent posts, system status, automation runs, one-click YouTube sync. |
| **Blog posts** | Search and filter; publish/unpublish, preview or delete any post. |
| **Editor** | Rich text (headings, lists, quotes, links, images, YouTube embeds); paste or drop images straight in. Cover + optional card thumbnail, category, tags, featured, companion video, author, SEO with a live Google preview and **Suggest** (AI). Set a future publish date to schedule. Ctrl/⌘+S saves. |
| **AI writer** | Generate a draft from your topic list or your own idea. It lands as a draft for review. Also shows the automation settings, the cron URL and run history, plus a "Run automation now" button. |
| **Media library** | Upload (auto-resized to WebP with a blur placeholder), edit alt text, copy URLs, delete. |
| **Videos** | Sync from YouTube, add any video by link, set series, feature on the homepage or hide. |
| **Journey** | Add, edit, hide or delete timeline chapters (photo and related video optional). |
| **Messages** | Enquiries from the Collaborate page: read, reply by email, archive. |
| **Settings** | Hero copy, bio, story, quick facts, stats, principles, social links, AI voice/guidelines/topics/categories/avoid-list, comments, automation rules and **Login & password** (change the login email or password any time; other devices are signed out). |

---

## Security

- `/admin` and `/api/admin/*` are gated twice: `src/proxy.ts` verifies the signed session cookie before anything renders, and every page and route re-checks the session in MongoDB, so sign-out revokes immediately.
- The admin password is stored in MongoDB only as a scrypt hash (never in plain text). It can be changed from Settings → Password, which signs out every other device; repeated wrong attempts are rate-limited.
- Login requires the password **and** a single-use math CAPTCHA. The signed token holds only an HMAC of the answer and expires in 5 minutes.
- Brute-force protection: 8 failed attempts per IP per 15 min, plus a global ceiling. The limits are stored in MongoDB, so they work across serverless instances.
- Cookies are `HttpOnly`, `SameSite=Strict`, `Secure` and `__Host-` prefixed in production. Sessions last 8 hours.
- State-changing admin requests must come from the site's own origin (CSRF defence).
- All rich content is sanitised server-side before storage. Only YouTube iframes are allowed, rewritten to `youtube-nocookie.com`.
- Uploads are validated by their real bytes (not the client's file type), size- and pixel-limited, and re-encoded.
- The cron secret is compared in constant time, with IP throttling of bad attempts.
- Security headers include HSTS, `X-Frame-Options`, `nosniff`, a CSP `frame-ancestors`/`base-uri`, and `X-Robots-Tag: noindex` on admin.

> If you deploy behind a proxy that doesn't set `X-Forwarded-For` itself, per-IP rate limits can be spoofed; the global login limit still applies. Vercel, Netlify, Render and Cloudflare set this header correctly.

---

## Architecture

```
src/
├─ app/
│  ├─ (site)/            public pages: home, journey, videos, blog, collaborate
│  ├─ admin/             login + (panel) Studio pages (server-guarded layout)
│  ├─ api/admin/…        protected JSON APIs (auth, posts, media, ai, videos, …)
│  ├─ api/automation/    external-cron endpoint
│  ├─ api/media/…        GridFS image streaming (immutable cache)
│  ├─ sitemap.ts, robots.ts, feed.xml, opengraph-image, icon
├─ components/           site/, home/, blog/, video/, journey/, admin/, ui/
├─ lib/
│  ├─ env.ts             server-only config
│  ├─ db/ models/        Mongo connection + Mongoose schemas & indexes
│  ├─ auth/              password (scrypt), session, captcha, rate-limit, token
│  ├─ services/          posts, media, videos, youtube, milestones, settings, cover, automation
│  ├─ ai/                Groq client, prompts, blog generator & validation
│  ├─ content/html.ts    sanitiser, markdown → HTML, TOC
│  ├─ og/art.tsx         branded cover / OG artwork (next/og)
│  └─ validation/        zod schemas (post, settings)
└─ proxy.ts              admin gate (Next 16 "middleware")
scripts/                 seed, hash-password, secrets
```

Business logic lives in `lib/services` and `lib/ai`. Route handlers only authenticate, validate and delegate, and UI components never touch the database.

Public pages use ISR (revalidated every 5 min, plus instantly after any Studio change). Data loaders fail soft, so a brief database blip shows a graceful page rather than an error.

---

## Content notes

- The seeded journey chapters are drawn from the channel's public videos (dates, NSUT, the METI research internship in Japan, placement, HCLTech Lucknow). The three starter articles are general guides. **Please review and edit them in the Studio before launch.**
- Homepage stats (subscribers, videos) are editable text in **Settings → Profile & homepage**.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint / TypeScript |
| `npm run db:local` | Local development MongoDB on port 27017 (data in `./.data`) |
| `npm run seed` | Idempotent starter content + ensures DB indexes |
| `npm run admin:hash-password` | Create `ADMIN_PASSWORD_HASH` (the starting password) |
| `npm run admin:reset-password` | Forgot the login? Sets a new password (and optionally email) directly in the database and signs out all devices |
| `npm run secrets` | Generate `AUTH_SECRET` and `CRON_SECRET` |
