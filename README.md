# Museum of Me

A small museum made by the people who know you best. An owner creates a collection, friends add hidden memories without signing up, and the gallery opens automatically when its threshold is reached. Open galleries have downloadable PNG posters. No AI features.

## Local development

Requirements: Node.js 22 or 24, npm, and a Supabase project. Docker is needed only for the optional local Supabase stack and database/smoke tests.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

On PowerShell use `Copy-Item .env.example .env.local`; if script execution is restricted, use `npm.cmd` instead of `npm`. Open http://localhost:3000. The landing page, `/demo` and privacy page work without external services. Creating real museums requires Supabase; guest submissions also require Turnstile. Missing security configuration fails closed.

For a production server:

```sh
npm run build
npm start
```

`npm start` now runs the production build. `npm run start:prod` is an equivalent alias. Public ENV values are embedded at build time: rebuild after changing them.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Yes | Exact app origin, e.g. `https://your-museum.vercel.app`; no trailing slash. Used for invites, OAuth, Origin checks and Turnstile hostname verification. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key; RLS protects browser access. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only Service Role key. Never prefix with `NEXT_PUBLIC_`. |
| `SECURITY_SECRET` | Yes | Server-only random secret, at least 32 characters, identical on every instance. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | For submissions | Cloudflare widget site key. |
| `TURNSTILE_SECRET_KEY` | For submissions | Server-only Cloudflare secret. |
| `PEXELS_API_KEY` | Optional | Server-only Pexels key. Without it, image search is disabled; uploads/text still work. |
| `NEXT_PUBLIC_SUPABASE_GOOGLE_ENABLED` | Optional | `true` only after configuring Google OAuth in Supabase; default `false`. |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` | Optional | Set `plausible` to enable analytics. Empty disables all analytics requests and attribution storage. |
| `NEXT_PUBLIC_ANALYTICS_DOMAIN` | With analytics | The site identifier configured in Plausible. |
| `NEXT_PUBLIC_ANALYTICS_ENDPOINT` | Optional | Defaults to `https://plausible.io/api/event`; supports a trusted self-hosted HTTPS endpoint. CSP permits its origin. |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Before public launch | Contact shown on `/privacy` for account/museum removal requests. |

Generate `SECURITY_SECRET`:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Do not commit `.env.local`, production keys or database credentials.

## Supabase setup and migrations

Create a Supabase project. Apply these migrations **in order** through SQL Editor or the CLI:

1. `202609110001_initial_museum_schema.sql` — profiles, museums, invitations and exhibits.
2. `202609130001_security_pass.sql` — RLS, private Storage, atomic writes and shared rate limits. Weak old invite tokens rotate; owners get new links in their dashboard.
3. `202609130002_public_mvp.sql` — anonymous collection identifiers for funnels, exact unlock result, Vercel-compatible upload limit.

For an existing database apply only the unapplied migrations. Never re-run the initial schema over existing tables. For CLI deployment:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Configure Auth → URL Configuration with the production Site URL and explicit redirect URLs such as `https://your-domain/auth/callback`. Add `http://localhost:3000/auth/callback` for local development. Enable email sign-in, configure a production SMTP sender, and verify real email delivery before inviting users. Supabase's default email sender is intended for limited testing, not general public onboarding.

In **Magic Link** and **Confirm Signup** email templates include both `{{ .ConfirmationURL }}` and `{{ .Token }}`. Example:

```html
<h2>Your Museum of Me sign-in</h2>
<p>Your code: <strong>{{ .Token }}</strong></p>
<p><a href="{{ .ConfirmationURL }}">Open your museum</a></p>
```

A magic link must be opened in the browser where sign-in began (PKCE); the email code can be entered there instead. Google is optional; configure provider credentials and its Supabase callback before enabling the UI.

The `exhibits` bucket is created by migrations and must remain private. Do not add public upload/read policies. New uploads are decoded and re-encoded on the server; signed URLs are issued only after reveal. See [SECURITY.md](SECURITY.md) for access rules, rate limits and migration notes for existing files. For removal requests, a trusted operator removes Storage objects and exhibit rows first, then the museum/account; never expose Service Role operations to visitors.

### Optional local Supabase

```sh
npm run db:start
npm run db:status
```

The isolated `museum-mvp` stack uses API port `55321`, Postgres `55322`, and test email inbox `55324`. Copy its API URL, anon key and Service Role key to `.env.local`. The CLI applies migrations on first startup. To apply new local migrations later use `npx supabase migration up --local`. `npm run db:stop` stops the stack while preserving its local data.

## Pexels and uploads

Create a Pexels API key and set `PEXELS_API_KEY`. Searches run on the server, require an active invitation and are rate limited; the key never reaches the browser. Photo selection retains photographer attribution. If search fails, friends can still add their own image or a text memory.

The browser accepts originals up to 12 MiB and resizes them to WebP. The server accepts at most 4 MiB plus bounded multipart overhead, below [Vercel's 4.5 MB function payload limit](https://vercel.com/docs/functions/limitations). It verifies real MIME and decodes the image again. PNG posters can be saved as story, square or landscape images; shared links always open the gallery.

## Cloudflare Turnstile

Create a Turnstile widget and allow your exact production hostname (and `localhost` if using it for development). Set both keys. Every submission verifies success, hostname and `action=submit_exhibit` through Cloudflare Siteverify. Failed or expired challenges are retried with a fresh token; missing keys never disable server verification.

Cloudflare's [dummy keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) may return fixed hostname/action values. Use a real widget configured for localhost for manual end-to-end checks. Automated tests isolate the external boundary without adding any bypass flag or test route to the application. Never configure test keys in Vercel production.

## Product analytics

The app sends the requested 12 custom events directly to the [Plausible Events API](https://plausible.io/docs/events-api). No third-party script or analytics cookies are required. Enable the provider and domain through ENV, then add matching custom-event goals in Plausible:

`landing_view`, `create_started`, `signup_completed`, `museum_created`, `invite_copied`, `invite_opened`, `exhibit_started`, `exhibit_submitted`, `viral_cta_clicked`, `museum_unlocked`, `museum_viewed`, `museum_shared`.

Only event names, a random non-secret collection identifier (`museum`), creation source, target count, and share method/format are sent. There are no names, emails, captions, auth IDs, invite tokens, slugs, URL query strings or referrers. URLs are synthetic screen paths. Do Not Track and Global Privacy Control disable tracking. Plausible still receives normal network metadata; see the provider's privacy policy. Session storage deduplicates views and remembers the creation source; the product works when storage, analytics or the provider is blocked.

| Metric | Definition |
| --- | --- |
| Invite open → exhibit submit | `exhibit_submitted / invite_opened`, segmented by `museum`; also inspect the `exhibit_started` drop-off. |
| Exhibit submit → create own museum | `museum_created` with `source=exhibit` divided by `exhibit_submitted`; `viral_cta_clicked` and `create_started` show the intermediate drop-off. |
| Museum created → invites opened | Share of created `museum` identifiers with at least one later `invite_opened`; also report number of opens per created museum. |
| Museum unlocked → share | Share of unlocked `museum` identifiers with at least one later `museum_shared`; segment `method=copy/native/download`. |

The last two are **collection cohorts across different people**, not visitor-session funnels. Use Plausible custom-property exports/grouping to join on `museum` within a chosen observation window (e.g. seven days); raw event-count ratios are not equivalent. `museum_unlocked` comes from the exact successful database transition and is emitted by the final contributor. Shares are recorded after successful copy/native share or initiating a validated PNG download, not on cancelled share dialogs. Analytics is best effort: blockers, closed tabs and network failures can undercount; operational counts remain in PostgreSQL.

## Checks and Playwright smoke tests

```sh
npm run lint
npm run typecheck
npm test
npm run test:security:db
npm run build
npm audit
```

`npm run check` combines lint, typecheck, unit tests and production build. The database security test uses a disposable Postgres container and does not access production.

For desktop and mobile browser tests:

```sh
npm run db:start
npx playwright install chromium
npm run test:e2e
```

On Windows the test runner uses an installed Microsoft Edge automatically; `PLAYWRIGHT_CHANNEL` can override the browser. The runner reads only local Supabase CLI status, builds the app with test ENV and starts a dedicated production server on port 3100. Never point the smoke suite at production.

The smoke scenario verifies real owner email authentication, museum creation, three separate guest browser sessions, image upload into private Storage, hidden exhibits, automatic dashboard refresh, reveal, all poster formats, PNG download, gallery sharing and the analytics payloads. External Turnstile/Pexels and the analytics receiver are fixtures; Supabase Auth, RLS, RPCs and Storage are real. An admin-generated local email code makes email transport deterministic; test actual SMTP and the real Turnstile widget separately before launch. Each test deletes only its own data.

Screenshots and failure traces are saved under `test-results/`; open the report with `npx playwright show-report`. Browser runs overwrite the local `.next-build` with test settings: rebuild with your normal ENV before using `npm start`. Production deployment always builds afresh. No test fixtures are imported by production source.

## Vercel deployment

1. Import the repository into Vercel and choose the Next.js framework. `vercel.json` uses `npm ci` and `npm run build`; keep the default Next.js output handling, including the configured build directory.
2. Select Node.js 22 or 24. Set production ENV from the table above. Keep server keys marked sensitive. Leave analytics empty if no provider account is ready.
3. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin. Configure the same origin in Supabase Auth redirects and its hostname in Turnstile. Set a real support contact and SMTP sender.
4. Apply all pending Supabase migrations **before** deploying this version. Never make the Storage bucket public to troubleshoot uploads.
5. Deploy. Changes to `NEXT_PUBLIC_*` require a rebuild/redeploy. Give previews their own Supabase project and matching URL/widget configuration rather than sharing production data.
6. On the deployed URL, create a museum in an owner browser, contribute from separate friend browsers, verify the locked state, reach the threshold, open the gallery and download/share a poster. Check email delivery, actual Turnstile, private file access, and your analytics goals.

This repository contains deployment configuration and reproducible tests. Publication still requires access to your Vercel account and production Supabase/Turnstile credentials; running local smoke tests does not publish a site.
