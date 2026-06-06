# AGENT.md

## Overview

Echo Analyze is a Supabase-authenticated Mutual Fund CAS analysis app with admin analytics.

- Backend: FastAPI parses CAS PDFs/JSON, computes portfolio analytics, stores privacy-preserving admin telemetry, and serves the built SPA.
- Frontend: React/Vite renders the upload flow, dashboard, admin console, CSV exports, and PDF/image captures.
- Deployment: Vercel routes `/api/*` plus SPA routes (`/`, `/dashboard*`, `/admin*`, `/pricing*`) to `app/Code/main.py` and serves committed static assets from `static/`.

## Runtime Entry Points

- Backend shim: `app/main.py`
- Real backend app: `app/Code/main.py`
- Backend package initializer: `app/Code/__init__.py` loads local `.env` values for development.
- Frontend source: `frontend/src/`
- Built frontend assets: `static/`
- Supabase setup artifacts: `supabase/`

Important: top-level modules under `app/` are compatibility shims that re-export `app/Code/*`. Change backend logic in `app/Code/`.

## Backend Map

- `app/Code/main.py`: FastAPI routes, upload/webhook body validation, response models, security headers, parser timeout wrapper, report-credit enforcement, and portfolio analysis pipeline.
- `app/Code/billing.py`: Supabase service-role billing RPC client, report-credit reservation/refund helpers, Razorpay subscription creation, checkout verification, webhook verification, and webhook idempotency helpers.
- `app/Code/supabase_auth.py`: Supabase session verification, username extraction, admin checks, and optional Auth admin user counts.
- `app/Code/analytics.py`: SQLite-backed admin metrics and sanitized audit/analysis logs.
- `app/Code/cas_parser.py`: CAS PDF parsing adapter plus Excel export helpers.
- `app/Code/utils.py`: NAV/history fetchers, cache persistence, and XIRR solver.
- `app/Code/holdings.py`: holdings sourcing from optional API, AMFI disclosures, and Groww fallback.
- `app/Code/overlap.py`: fund overlap matrix calculation.

## Frontend Map

- `frontend/src/pages/UploadPage.tsx`: upload and analyze flow.
- `frontend/src/pages/DashboardPage.tsx`: dashboard route, session restoration, notices modal, and PDF export.
- `frontend/src/pages/AdminPage.tsx`: admin analytics console.
- `frontend/src/pages/PricingPage.tsx`: subscription UI and Razorpay checkout handoff.
- `frontend/src/auth/`: Supabase sign-in/sign-up state and auth gate.
- `frontend/src/api/client.ts`: authenticated same-origin API fetch helper.
- `frontend/src/lib/supabase.ts`: Supabase browser client, access-token helper, username/admin metadata helpers.
- `frontend/src/lib/razorpayCheckout.ts`: Razorpay checkout script loader with retry/timeout handling.
- `frontend/src/lib/downloadFilename.ts`: shared browser-download filename sanitizer for generated dashboard exports.
- `frontend/src/lib/analysisSession.ts`: session-scoped dashboard restoration.
- `frontend/src/lib/csv.ts`: CSV and spreadsheet formula escaping.
- `frontend/src/components/dashboard/`: dashboard cards, sections, charts, and exports.
- `frontend/src/types/api.ts` and `frontend/src/types/admin.ts`: TypeScript mirrors of backend API contracts.

## Local Commands

Backend tests:

```powershell
venv\Scripts\python.exe -m unittest -q tests.test_security_accuracy
venv\Scripts\python.exe -m unittest -q tests.test_security_accuracy.TestBillingSecurity
venv\Scripts\python.exe -m compileall -q app casparser tests
venv\Scripts\python.exe -m bandit -r app casparser -x "*/__pycache__/*" -f txt
```

Python dependency audit:

```powershell
venv\Scripts\python.exe -m pip_audit -r requirements.txt
```

Frontend checks:

```powershell
cd frontend
npm run lint
npm run typecheck
npm test -- --run
npm audit --audit-level=moderate
npm run build
```

Run locally:

```powershell
run_local.bat
```

## Version Notes

- Frontend lockfile currently uses patched Vite/Rollup/jsPDF-related packages. Vite warns unless Node is at least `20.19` or `22.12`; upgrade local Node even though the current build may still complete on `20.17`.
- `casparser/` vendors the current CAS parser source so the app can use `pdfminer-six==20251230` without the upstream `casparser==0.8.1` hard pin to a vulnerable pdfminer build.

## Security Posture

- Protected API routes verify the Supabase bearer token with Supabase Auth before processing requests.
- Admin API access requires a Supabase admin user. By default this means trusted `app_metadata.role = "admin"` or `app_metadata.is_admin = true`; user-editable `user_metadata` must never grant admin access. Backend allowlists can also be configured with `SUPABASE_ADMIN_USER_IDS` or `SUPABASE_ADMIN_EMAILS`.
- Display usernames are treated as potentially user-supplied PII. Backend, frontend fallback, analytics, and Supabase profile cleanup should redact email, PAN-like, phone-like, and control-character content before storing or showing usernames outside the account owner context.
- Frontend API calls attach Supabase bearer tokens only to same-origin requests, and `apiFetch` strips `Authorization` from cross-origin requests even if a caller supplied one. Keep it a same-origin app API helper.
- Vite exposes only `APP_SUPABASE_*` variables to the browser bundle. Do not widen `envPrefix` to broad prefixes such as `APP_` unless every matching variable is intentionally public.
- Backend local env loading may read `frontend/.env` and `frontend/.env.local`, but only for browser-public prefixes (`APP_SUPABASE_*`, `VITE_*`, `NEXT_PUBLIC_*`). Do not relax that gate or frontend-only files can silently configure backend secrets.
- `/api/analyze`, `/api/parse_pdf`, `/api/auth/me`, `/api/billing/*`, `/api/admin/overview`, `/dashboard*`, `/admin*`, `/pricing*`, and `/` return no-store cache headers.
- Uploads are limited to 25 MB, allowed extensions/content types are checked, PDF magic bytes are validated, and JSON shape is validated before analysis.
- `/api/analyze` and `/api/parse_pdf` reserve report credit only after request validation. Parser failures, malformed parsed payloads, analysis failures, and internal errors refund consumed free-report credit; successful PDF JSON/Excel parsing consumes credit just like analysis.
- CAS PDF parsing runs in a killable subprocess locally when available, with `PDF_PARSE_TIMEOUT_SECONDS` capped between 1 and 240 seconds and defaulting to 120. `PDF_PARSE_EXECUTOR=auto` uses thread parsing on Vercel to avoid hosted child-process hangs.
- Razorpay checkout and webhook signatures are verified with HMAC. The webhook route uses the exact raw body, rejects bodies over 256 KB before signature work, checks `echo_has_razorpay_webhook_event` before processing, and records event IDs only after subscription state is applied.
- Razorpay webhook event IDs are trimmed and limited to a small safe identifier character set before duplicate-check or claim RPCs run; malformed IDs return `400` after signature verification.
- Supabase subscription updates preserve `authenticated` or `active` status, plus current period end, when a stale `created` or `pending` event arrives later. Cancellation, paused, expired, and similar terminal or restricted statuses can still downgrade access.
- `/api/billing/verify-subscription-payment` length-limits Razorpay IDs/signatures before signature and subscription verification.
- Razorpay subscription creation sends only the stable Supabase user id and source marker in `notes`; do not add username, email, uploaded filenames, CAS content, or portfolio values to Razorpay metadata.
- Razorpay checkout script loading is isolated in `frontend/src/lib/razorpayCheckout.ts`; keep retry and timeout behavior there rather than adding ad hoc `<script>` injection in page components.
- Razorpay live Checkout can block UPI QR/payment creation when the browser origin does not match the website(s) registered in the Razorpay Dashboard. Use test keys for localhost, and keep production/custom/Vercel domains registered with Razorpay before debugging QR rendering code.
- CAS parser imports resolve to the repo-local `casparser/` package. Keep `app/Code/pdfminer_hardening.py` as defense-in-depth around CMap loading.
- CAS JSON numeric parsing accepts common INR forms such as `Rs. 1,000`, `INR 1,000`, the rupee symbol, non-breaking spaces, and accounting parentheses, then still requires a finite numeric value.
- Logs and analytics sanitize usernames, messages, PAN-like tokens, emails, phone numbers, and control characters.
- CAS files, parsed CAS reports, uploaded filenames, and per-report portfolio market values must not be stored in admin telemetry. Admin views should show usernames only, not email addresses or raw Supabase IDs.
- CSV and Excel exports escape spreadsheet formula prefixes, including leading tab/CR/LF cells and leading whitespace before `=`, `+`, `-`, or `@`.
- Dashboard analysis handoff is in memory only; do not persist full CAS analysis data in Web Storage or browser history state.
- Generated dashboard PDF filenames are sanitized client-side before `jsPDF.save`; keep filename cleaning in `frontend/src/lib/downloadFilename.ts`.
- Responses include a restrictive Content Security Policy in addition to `nosniff`, `DENY` framing, and referrer-policy headers. CSP `connect-src` preserves explicit Supabase ports for local development and includes Razorpay checkout/API/telemetry origins (`checkout.razorpay.com`, `api.razorpay.com`, and `lumberjack.razorpay.com`); `script-src` must also allow Razorpay's checkout/static/CDN script origins (`checkout.razorpay.com`, `checkout-static-next.razorpay.com`, and `cdn.razorpay.com`) or UPI QR and payment creation can fail inside Checkout.

## Known Residual Risks

- Python dependencies are direct pins/ranges rather than a full lockfile. Run `pip-audit -r requirements.txt` before deployment and consider adding a generated lockfile for reproducible backend installs.
- A full environment audit may also report vulnerabilities in packaging tools such as `pip`; keep the venv tooling upgraded separately from app requirements.
- Runtime files under `data/` can contain cached market data, logs, or analytics from local use. Treat them as sensitive and keep them out of git.
- There is no separate application-wide rate limiter; production deployments should pair Supabase auth/report quotas with platform or edge throttling for abusive authenticated traffic.
- The production build currently emits a Vite warning for the large dashboard chunk. This is a performance warning, not a failing build; consider route-level or chart/export-library chunk splitting if first-load size becomes painful.

## Data, Caches, And Environment

- Runtime caches and SQLite analytics live in `data/` by default and are ignored by git.
- Debug logging writes to `data/backend_debug.log` only when `ENABLE_DEBUG_LOGS=true`.
- `ANALYTICS_DB_PATH` can move the admin SQLite database; Vercel defaults to ephemeral `/tmp`.
- Supabase backend env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, optional `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ADMIN_ROLE`, `SUPABASE_ADMIN_USER_IDS`, and `SUPABASE_ADMIN_EMAILS`.
- Supabase frontend env: `APP_SUPABASE_URL`, `APP_SUPABASE_ANON_KEY`, and optional `APP_SUPABASE_ADMIN_ROLE`. Never put service-role credentials in `frontend/`.
- Supabase migrations/admin helper SQL live in `supabase/`; keep Supabase-side schema changes there.
- `supabase/migrations/20260604001000_harden_razorpay_webhook_idempotency.sql` is a forward migration for projects that already applied the original billing migration. Apply it to add the service-role-only webhook duplicate check and stale-event guard.
- `supabase/migrations/20260605000000_harden_username_pii_redaction.sql` updates `echo_clean_username` and backfills existing `profiles.username` values so email, PAN-like, and phone-like display names are redacted in the database.
- CORS origins come from `CORS_ALLOW_ORIGINS`; `*` is intentionally filtered out because credentials are enabled.
- Vercel SPA routes for dashboard, admin, and pricing must stay routed through FastAPI so security/cache headers are applied before serving `static/index.html`.
- Optional holdings API endpoint comes from `HOLDINGS_API_URL`.

## Maintenance Rules

- Rebuild `static/` from `frontend/` after frontend or frontend dependency changes intended for deployment.
- When adding a new frontend route, update both FastAPI SPA routes and `vercel.json`; add a config regression test if the route is user/session/billing sensitive.
- Keep backend Pydantic models and frontend TypeScript types in sync when response fields change.
- Add focused tests for admin access, username PII redaction, same-origin token handling, telemetry privacy, upload validation, INR/numeric parsing, parser resilience, report-credit reserve/refund behavior, Razorpay metadata minimization, webhook body/event-id limits, webhook signatures/idempotency, checkout script loading, SPA route config, env exposure, download filename sanitization, and export escaping when touching those areas.
- Treat benchmark and holdings data as best-effort. Methodology and data-quality warnings are part of the API/UI contract.
- If dependency audits flag `pdfminer-six`, prefer upgrading the direct pin and running parser regressions before changing the vendored parser.
