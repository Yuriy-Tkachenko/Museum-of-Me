# Museum of Me

A small museum made by the people who know you best. An owner creates a collection, friends add hidden memories without signing up, and the gallery opens automatically when its threshold is reached. Open galleries have downloadable PNG posters. Optional portrait background removal runs on the visitor's device.

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

## Administrator panel

Run `node scripts/prepare-admin.mjs` with your Supabase keys in `.env.local`. It creates the private `museum-admin-analytics` bucket, restricts administration to `ADMIN_EMAIL` (default: `yuriy.tk4ko@gmail.com`), and generates a session secret when missing. Rebuild and restart, then open `/admin/login`. The administrator first signs in through Google on Google’s own page and then confirms the TOTP factor attached to that Supabase account. If no factor exists, the page displays a QR code for Google Authenticator. The app never receives or stores the Google password. Set `ADMIN_EMAIL` and `ADMIN_SESSION_SECRET` as server variables in production; changing either invalidates administrator sessions. No additional SQL is required.

The Russian panel shows all Supabase Auth accounts, profile usernames and museum links. User passwords cannot be retrieved; the panel never collects them. Administrator sessions require the configured Google identity plus TOTP, last eight hours, and use signed HttpOnly cookies. Login requests are limited through the database. Data is checked server-side on every page load. `node scripts/check-admin.mjs` verifies panel access and analytics with disposable, isolated records; Google OAuth itself remains a manual provider check.

Museums with at least one response and fully opened museums come from current database records. Verified post-submission CTA clicks and parent/child museum relationships are stored as private JSON events from setup onward. Repeated clicks are deduplicated per browser and originating museum; the overall participant count deduplicates browsers across museums. Attribution uses the latest signed first-party referral within 30 days, in the same browser, and works through Google login. Gallery CTA referrals are also attributed. Deleted museums are excluded from current metrics. The average offspring count is attributed child museums divided by all current museums. Past clicks cannot be recovered; network failures can undercount events. Keep the analytics bucket private and include it in operational backups and removal procedures.

## Environment variables reference

Museum owners sign in only through Google OAuth. Their Google email and password are entered on Google’s own page and are never sent to Museum of Me. No additional Authenticator step is required for owners. The administrator panel accepts only `yuriy.tk4ko@gmail.com` (or an explicit `ADMIN_EMAIL` override) and then requires a six-digit Google Authenticator code.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Yes | Exact app origin, e.g. `https://your-museum.vercel.app`; no trailing slash. Used for invites, OAuth, Origin checks and Turnstile hostname verification. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key; RLS protects browser access. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only Service Role key. Never prefix with `NEXT_PUBLIC_`. |
| `SECURITY_SECRET` | Yes | Server-only random secret, at least 32 characters, identical on every instance. |
| `ADMIN_EMAIL` | Admin panel | The only Google account allowed into the panel; defaults to `yuriy.tk4ko@gmail.com`. |
| `ADMIN_SESSION_SECRET` | Admin panel | Server-only secret used to sign the eight-hour administrator session. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | For submissions | Cloudflare widget site key. |
| `TURNSTILE_SECRET_KEY` | For submissions | Server-only Cloudflare secret. |
| `PEXELS_API_KEY` | Optional | Server-only Pexels key. Without it, image search is disabled; uploads/text still work. |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` | Optional | Set `plausible` to enable analytics. Empty disables external Plausible requests; administrator referral statistics are independent. |
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
4. `202610060001_museum_portraits.sql` — optional personal portraits, private `portraits` bucket and atomic portrait association when creating a museum.

Museum creation includes an optional portrait upload and a live carousel preview. JPEG, PNG and WebP originals up to 12 MiB are prepared in the browser and re-encoded on the server (up to 2,400 pixels). The owner can view the portrait while collecting; public galleries receive signed portrait URLs only after opening. Apply migration 4 before deploying this version. Keep the `portraits` bucket private. Account removal must also delete the portrait object named by each museum's `portrait_path`.

For an existing database apply only the unapplied migrations. Never re-run the initial schema over existing tables. For CLI deployment:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Configure Auth → URL Configuration with the production Site URL and explicit redirect URLs such as `https://your-domain/auth/callback`. Add `http://localhost:3000/auth/callback` for local development. Configure Google as the only public sign-in provider, add its Client ID and Client Secret in Supabase, and add the Supabase callback URL to the Google OAuth client. Supabase TOTP enrollment is not used for museum-owner accounts. No SMTP service is needed for this sign-in flow.

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

For localhost testing, set `LOCAL_TURNSTILE_TEST_MODE=true`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA`, and `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`, then rebuild and restart. These are Cloudflare's [official dummy keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/). The server still calls Siteverify and requires a confirmed dummy response. This mode accepts only the exact key pair and dummy token with an HTTP localhost origin; it rejects public domains. Use a real widget for public deployment and set the test mode to false. Never configure test keys in Vercel production. Automated smoke tests also isolate the external boundary with fixtures.

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

The private `/admin?tab=analytics` dashboard also keeps first-party, pseudonymous funnel events in the private `museum-admin-analytics` Supabase Storage bucket. It measures unique invitation opens, form starts, open-gallery views, and successful share actions independently of Plausible. Replies and museum status come directly from PostgreSQL. No email, name, invite token, memory text, image, slug, full URL, or referrer is stored in these funnel events. Existing projects only begin accumulating the new funnel stages after deploying this version; historical browser actions cannot be reconstructed.

## Checks and Playwright smoke tests

```sh
npm run lint
npm run typecheck
npm test
npm run test:ui
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

The smoke scenario covers museum creation, three separate guest browser sessions, image upload into private Storage, hidden exhibits, automatic dashboard refresh, reveal, all poster formats, PNG download, gallery sharing and analytics payloads. External Google OAuth, Turnstile, Pexels and the analytics receiver require test fixtures or separate manual verification; Supabase Auth, RLS, RPCs and Storage remain real. Each test deletes only its own data.

Screenshots and failure traces are saved under `test-results/`; open the report with `npx playwright show-report`. Browser runs overwrite the local `.next-build` with test settings: rebuild with your normal ENV before using `npm start`. Production deployment always builds afresh. No test fixtures are imported by production source.

## Vercel deployment

1. Import the repository into Vercel and choose the Next.js framework. `vercel.json` uses `npm ci` and `npm run build`; keep the default Next.js output handling, including the configured build directory.
2. Select Node.js 22 or 24. Set production ENV from the table above. Keep server keys marked sensitive. Leave analytics empty if no provider account is ready.
3. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin. Configure the same origin in Supabase Auth and Google OAuth redirects and its hostname in Turnstile. Set a real support contact.
4. Apply all pending Supabase migrations **before** deploying this version. Never make the Storage bucket public to troubleshoot uploads.
5. Deploy. Changes to `NEXT_PUBLIC_*` require a rebuild/redeploy. Give previews their own Supabase project and matching URL/widget configuration rather than sharing production data.
6. On the deployed URL, sign in through Google, create a museum, contribute from separate friend browsers, verify the locked state, reach the threshold, open the gallery and download/share a poster. Separately verify administrator Google login with `ADMIN_EMAIL` and the current Authenticator code, actual Turnstile, private file access, and your analytics goals.

This repository contains deployment configuration and reproducible tests. Publication still requires access to your Vercel account and production Supabase/Turnstile credentials; running local smoke tests does not publish a site.
