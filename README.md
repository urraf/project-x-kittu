# Life of KittuKun

The learning platform for **Chitranshu Rajput** and his YouTube channel [Life of KittuKun](https://www.youtube.com/@lifeofkittukun), helping Indian students study, intern and work in Japan.

- **Public site:** live sessions with booking and payment, a study store (PDF guides), an opportunity finder (internships and scholarships), a directory of 207 Japanese universities with the JapanUniMatch shortlist tool, the blog and video library, a Contact page, and "Ask Kittu", the chat assistant.
- **Student accounts (`/account`):** email + password or "Continue with Google". Bookings, join links, receipts, downloads and feedback in one place.
- **Studio (`/admin`):** a private dashboard for sessions, store, payments, students (including "Ask for feedback" emails), opportunities, universities, blog posts, videos, messages, reviews and site settings.
- **AI:** Groq-powered blog drafts in the creator's voice (plus automatic posts for new YouTube videos) and the chat assistant.

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
| `GROQ_CHAT_API_KEY` | for chat | Separate Groq key for the "Ask Kittu" website assistant (falls back to `GROQ_API_KEY`). |
| `GROQ_CHAT_MODEL` | – | Default `openai/gpt-oss-120b`; on rate limits it falls back to `openai/gpt-oss-20b`. |
| `GROQ_REASONING_EFFORT` | – | `low` (default) / `medium` / `high` for gpt-oss models. |
| `YOUTUBE_API_KEY` | – | Full channel sync with durations. Without it, the public RSS feed is used. |
| `YOUTUBE_CHANNEL_ID` | – | Defaults to the Life of KittuKun channel. |
| `UNSPLASH_ACCESS_KEY` | – | Stock-photo covers for AI posts. Otherwise video thumbnails or branded covers are used. |
| `MAX_UPLOAD_MB` | – | Image upload limit (default 8). |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | for paid sessions | Razorpay API keys. Without them, only free sessions can be booked. |
| `PAYMENTS_DEMO` | – | `true` = practice checkout for paid sessions while there are no Razorpay keys (no real money, marked "demo" in the Studio). Ignored once keys are set. |
| `RAZORPAY_WEBHOOK_SECRET` | recommended | Confirms bookings even if the student closes the tab right after paying. |
| `BREVO_API_KEY` or `RESEND_API_KEY` | for emails | Sign-up codes, password resets, booking confirmations, reminders, feedback requests and new-message alerts. HTTPS APIs (work where SMTP is blocked). |
| `SMTP_USER` / `SMTP_PASS` | for emails (alternative) | Gmail address + App Password. `SMTP_HOST` / `SMTP_PORT` default to Gmail (465). Not usable on Render's free plan (SMTP ports blocked). |
| `EMAIL_FROM` | for emails | Verified sender, e.g. `Life of KittuKun <lifeofkittukunweb@gmail.com>`. |
| `GOOGLE_SIGNIN_CLIENT_ID` / `GOOGLE_SIGNIN_CLIENT_SECRET` | for Google sign-in | Shows "Continue with Google" on the login page. A **Web application** OAuth client (separate from the Calendar one below). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` | – | Real Google Meet links + calendar invites. Otherwise Jitsi links are generated. |
| `GOOGLE_CALENDAR_ID` | – | Default `primary`. |

All secrets are read server-side only (`src/lib/env.ts` is `server-only`). Only `NEXT_PUBLIC_SITE_URL` reaches the browser. It is baked in **at build time**, so set it before the first build and redeploy after changing it.

---

## Deploying (Render + MongoDB Atlas)

1. **Atlas:** in **Network Access**, allow `0.0.0.0/0` (Render has no fixed IP on the free plan). The connection string must name the database: `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/lifeofkittukun?retryWrites=true&w=majority`.
2. **Render:** New → Web Service → connect the repo. Build command `npm install && npm run build`, start command `npm start`, Node ≥ 20.9.
3. Add the environment variables from the table above (at least `MONGODB_URI`, `NEXT_PUBLIC_SITE_URL`, `AUTH_SECRET`, `ADMIN_PASSWORD_HASH`, `CRON_SECRET`, the Groq keys, Razorpay keys and an email provider), then deploy. If you add or change a variable later, use **Manual Deploy → Clear build cache & deploy**.
4. **Custom domain:** add it in Render → Settings → Custom Domains, set `NEXT_PUBLIC_SITE_URL` to it and redeploy. Update the Google sign-in redirect URI and the Razorpay webhook URL to the new domain too.
5. **Cron jobs** (cron-job.org works, free): `GET https://YOUR-DOMAIN/api/health` every 10 minutes (keeps the free instance awake and sends reminders/feedback emails), and optionally the video-posts endpoint below every 2–3 hours.
6. Open `/admin`, sign in with the starting password and change it in **Settings → Login & password**. The dashboard's **Website status** card shows which services (emails, payments, AI) are connected.

**Google sign-in setup:** Google Cloud Console → APIs & Services → OAuth consent screen (External, publish to "In production") → Credentials → Create OAuth client ID → **Web application**. Authorised JavaScript origin: `https://YOUR-DOMAIN`. Authorised redirect URI: `https://YOUR-DOMAIN/api/account/google/callback`. Put the ID and secret in `GOOGLE_SIGNIN_CLIENT_ID` / `GOOGLE_SIGNIN_CLIENT_SECRET`.

**Emails from lifeofkittukunweb@gmail.com:** on Render's free plan use Brevo: sign up, add `lifeofkittukunweb@gmail.com` as a sender (Senders & IP → Senders, click the verification email), create an API key, then set `BREVO_API_KEY` and `EMAIL_FROM="Life of KittuKun <lifeofkittukunweb@gmail.com>"`. On a paid plan, a Gmail App Password (`SMTP_USER` / `SMTP_PASS`) also works.

**Going live with Razorpay:** once the account is verified, swap `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` for the live keys (they start with `rzp_live_`), add the webhook (see Sessions → Setup) and redeploy.

Images are stored in MongoDB GridFS, so no extra storage service is needed and the app runs on any Node host (Render, Vercel, Railway, a VPS with `npm run build && npm start`).

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

### Blog posts for YouTube videos

Every public, full-length video gets one companion article, written from the video's captions (fetched from YouTube when available, otherwise its title and description) with the video embedded at the top and its thumbnail as the cover. Switch it on or off in **Studio → Settings → Automation → "Write a blog post for every new video"**.

- **Sync from YouTube** (Studio → Videos) writes posts for newly found uploads in the background (up to 3 per sync).
- **Studio → Videos** shows which videos have a post, with **Write blog** per video and **Write blogs for all** for older videos.
- For hands-off posting, schedule this endpoint every 1–3 hours (request timeout ≥ 300 s). It syncs the channel, then writes up to `max` posts (default 1), newest videos first:

```bash
curl -X POST "https://YOUR-DOMAIN/api/automation/video-posts" \
  -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" -d '{"max":1}'
```

Video posts don't count towards the daily limit above. A video that already has a post is never written again; delete the post to have it rewritten. Failed attempts are retried after 6 hours.

---

## Sessions (live group mentorship)

The creator schedules group sessions in **Studio → Sessions** (title, date, start time in IST, duration, price, seats). Students book on **/sessions**:

1. They enter name, email and phone (plus a quick math question) and pay with Razorpay, or book instantly if the session is free. A seat is held for 15 minutes while they pay, so a full session can't be oversold.
2. On payment, the booking is confirmed (in the browser **and** via the Razorpay webhook, whichever comes first). The student's account is created automatically from their email.
3. The student and the admin both get an email. Everyone booked into the same session gets the **same meeting link**.
4. One hour before the start, everyone gets a reminder with the link.
5. When the session ends, each student gets a personal, unguessable feedback link (also shown in their account). Their star rating and review appear on the Sessions page; the creator can hide, pin or delete reviews in **Studio → Reviews**.

**Student accounts.** The first booking with a new email creates an account automatically: the confirmation email contains the meeting link **and the login email + a generated password**. Booking again with the same email just confirms the seat and sends the link. Students log in at **/account/login** (also linked as "Log in" in the header), where they can also **sign up** themselves (name, email, phone, password, confirmed with a 6-digit code sent to their email) or reset a forgotten password with an emailed code. In **My account** they see their next session with a join button, past sessions, receipts and feedback links, and can edit their details or change their password (other devices get signed out). Passwords are stored only as scrypt hashes; codes are hashed, expire in 10 minutes and allow 5 tries. Accounts need email to be set up (codes and passwords arrive by email); in local development without an email service, emails are printed to the terminal instead.

**Meeting links.** With Google connected, each session gets a Google Calendar event with a Meet link, and booked students are added as guests. Without it, a free Jitsi Meet room is created (the host signs in on Jitsi when starting the call). The creator can also paste any Zoom/Meet link per session.

**Background emails need the keep-alive ping.** Reminders and feedback emails are sent whenever `GET /api/health` is called (at most once every 2 minutes, guarded by a database lock). Point an uptime/cron service at it every 5–10 minutes; on Render's free plan this ping also keeps the app awake.

### Setup

- **Trying it before Razorpay is ready:** set `PAYMENTS_DEMO=true`. Paid bookings open a practice checkout (pay or simulate a failure), and are confirmed, emailed and listed exactly like real ones, marked "demo". Delete demo bookings/sessions before going live.
- **Razorpay:** create API keys (test keys first), set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`. Add a webhook to `https://YOUR-DOMAIN/api/payments/razorpay/webhook` with the events `payment.captured` and `order.paid`, and put its secret in `RAZORPAY_WEBHOOK_SECRET`. Refunds for cancelled sessions are issued automatically through the API.
- **Email:** create a Brevo account (free: 300 emails/day), verify a sender, set `BREVO_API_KEY` and `EMAIL_FROM`. (Or Resend with a verified domain.) Every email attempt is logged in the `emaillogs` collection for 90 days.
- **Google Meet (optional):** in Google Cloud, enable the *Google Calendar API*, configure the OAuth consent screen (**publish it to "In production"**; in "Testing" mode Google expires the token after 7 days), create an OAuth client of type **Desktop app**, put the client ID/secret in `.env.local`, then run `npm run google:auth` and sign in with the host account. Copy the printed `GOOGLE_REFRESH_TOKEN` to your host.

Each service is optional, and **Settings → Sessions** shows the creator, in plain words, which ones are connected.

---

## Studio guide (for the creator)

| Section | What you can do |
| --- | --- |
| **Dashboard** | Post counts, recent posts, system status, automation runs, one-click YouTube sync. |
| **Sessions** | Schedule group sessions, see who booked (with phone, notes, payment, rating), copy emails or download the list, cancel a booking with refund, cancel a whole session (everyone is emailed and refunded), or repeat it next week in one click. |
| **Reviews** | Ratings from students. Hide, pin to the top, or delete. |
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
| `npm run google:auth` | One-time Google sign-in that prints `GOOGLE_REFRESH_TOKEN` for Meet links |
