# AGENT.md

## Overview

Echo Analyze is a protected Mutual Fund CAS analysis app.

- Backend: FastAPI parses CAS PDFs/JSON, computes portfolio analytics, stores lightweight admin telemetry, and serves the built SPA.
- Frontend: React/Vite renders the upload flow, dashboard, admin console, CSV exports, and PDF/image captures.
- Deployment: Vercel routes `/api/*` to `app/Code/main.py` and serves committed static assets from `static/`.

## Runtime Entry Points

- Backend shim: `app/main.py`
- Real backend app: `app/Code/main.py`
- Backend package initializer: `app/Code/__init__.py` loads local `.env` values for development.
- Frontend source: `frontend/src/`
- Built frontend assets: `static/`

Important: top-level modules under `app/` are compatibility shims that re-export `app/Code/*`. Change backend logic in `app/Code/`.

## Backend Map

- `app/Code/main.py`: FastAPI routes, upload validation, response models, security headers, parser timeout wrapper, and portfolio analysis pipeline.
- `app/Code/auth.py`: Clerk JWT verification, admin checks, optional authorized-party checks, and optional legacy cookie auth.
- `app/Code/analytics.py`: SQLite-backed admin metrics and sanitized audit/analysis logs.
- `app/Code/cas_parser.py`: CAS PDF parsing adapter plus Excel export helpers.
- `app/Code/utils.py`: NAV/history fetchers, cache persistence, and XIRR solver.
- `app/Code/holdings.py`: holdings sourcing from optional API, AMFI disclosures, and Groww fallback.
- `app/Code/overlap.py`: fund overlap matrix calculation.

## Frontend Map

- `frontend/src/pages/UploadPage.tsx`: authenticated upload and analyze flow.
- `frontend/src/pages/DashboardPage.tsx`: dashboard route, session restoration, notices modal, and PDF export.
- `frontend/src/pages/AdminPage.tsx`: admin analytics console.
- `frontend/src/lib/analysisSession.ts`: session-scoped dashboard restoration.
- `frontend/src/lib/csv.ts`: CSV and spreadsheet formula escaping.
- `frontend/src/components/dashboard/`: dashboard cards, sections, charts, and exports.
- `frontend/src/types/api.ts` and `frontend/src/types/auth.ts`: TypeScript mirrors of backend API contracts.

## Local Commands

Backend tests:

```powershell
venv\Scripts\python.exe -m unittest -q tests.test_security_accuracy
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
npm exec tsc -- -p tsconfig.app.json --noEmit
npm exec tsc -- -p tsconfig.node.json --noEmit
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

- Protected API routes expect Clerk bearer tokens by default. Cookie token fallback is disabled unless `CLERK_ALLOW_COOKIE_AUTH=true` is set for a legacy deployment.
- `CLERK_ALLOWED_PARTIES` restricts token `azp` values when present. Keep `CLERK_REQUIRE_AZP=true` unless supporting legacy tokens that omit `azp`.
- `CLERK_ALLOWED_ISSUERS` optionally restricts token `iss` values; configure it with your Clerk issuer URL in production.
- Clerk JWT validation requires signed RS256 tokens with `exp` and `sub` claims.
- `/api/analyze`, `/api/parse_pdf`, `/api/auth/me`, `/api/admin/overview`, `/dashboard*`, `/admin*`, and `/` return no-store cache headers.
- Uploads are limited to 25 MB, allowed extensions/content types are checked, PDF magic bytes are validated, and JSON shape is validated before analysis.
- CAS PDF parsing runs in a worker thread with `PDF_PARSE_TIMEOUT_SECONDS` capped between 1 and 120 seconds, defaulting to 30.
- CAS parser imports resolve to the repo-local `casparser/` package. Keep `app/Code/pdfminer_hardening.py` as defense-in-depth around CMap loading.
- Logs and analytics sanitize file names, PAN-like tokens, emails, phone numbers, and control characters.
- CSV and Excel exports escape spreadsheet formula prefixes, including leading whitespace/tab variants.
- Dashboard analysis handoff is in memory only; do not persist full CAS analysis data in Web Storage or browser history state.
- Responses include a restrictive Content Security Policy in addition to `nosniff`, `DENY` framing, and referrer-policy headers.

## Known Residual Risks

- Python dependencies are direct pins/ranges rather than a full lockfile. Run `pip-audit -r requirements.txt` before deployment and consider adding a generated lockfile for reproducible backend installs.
- A full environment audit may also report vulnerabilities in packaging tools such as `pip`; keep the venv tooling upgraded separately from app requirements.
- Runtime files under `data/` can contain cached market data, logs, or analytics from local use. Treat them as sensitive and keep them out of git.

## Data, Caches, And Environment

- Runtime caches and SQLite analytics live in `data/` by default and are ignored by git.
- Debug logging writes to `data/backend_debug.log` only when `ENABLE_DEBUG_LOGS=true`.
- `ANALYTICS_DB_PATH` can move the admin SQLite database; Vercel defaults to ephemeral `/tmp`.
- CORS origins come from `CORS_ALLOW_ORIGINS`; `*` is intentionally filtered out because credentials are enabled.
- Optional holdings API endpoint comes from `HOLDINGS_API_URL`.

## Maintenance Rules

- Rebuild `static/` from `frontend/` after frontend or frontend dependency changes intended for deployment.
- Keep backend Pydantic models and frontend TypeScript types in sync when response fields change.
- Add focused tests for auth, upload validation, parser resilience, and export escaping when touching those areas.
- Treat benchmark and holdings data as best-effort. Methodology and data-quality warnings are part of the API/UI contract.
- If dependency audits flag `pdfminer-six`, prefer upgrading the direct pin and running parser regressions before changing the vendored parser.
