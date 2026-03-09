# Code Review Report (2026-03-08)

Scope: full backend + frontend pass, including runtime checks, tests, lint, and build.

## Validation executed

- Backend tests: `python -m unittest discover -s tests -p "test_*.py" -v`
- Frontend lint: `npm run lint`
- Frontend tests: `npm test -- --run`
- Frontend build: `npm run build`

All tests and lint checks passed.

## Findings (fixed)

### 1) Temp-file leak on path-based PDF parsing

- Severity: Medium
- File: `app/Code/cas_parser.py` (`parse_with_casparser`)
- Issue: `NamedTemporaryFile(delete=False)` was created even for string path inputs; this could leave orphaned temp files.
- Fix: split path/buffer code paths so temp files are created only for buffer inputs.
- References:
  - `app/Code/cas_parser.py:39`
  - `app/Code/cas_parser.py:64`
  - regression test: `tests/test_security_accuracy.py:602`

### 2) Client-IP trust boundary missing for rate limiting

- Severity: Medium
- File: `app/Code/main.py`
- Issue: rate limiting trusted `X-Forwarded-For` unconditionally, which can be spoofed outside trusted proxy environments.
- Fix: introduced `TRUST_PROXY_CLIENT_IP` (defaults true on Vercel, false otherwise) and fallback to socket client IP.
- References:
  - `app/Code/main.py:86`
  - `app/Code/main.py:253`

### 3) Rate-limit bucket map could grow without periodic sweep

- Severity: Medium
- File: `app/Code/main.py`
- Issue: in-memory map keyed by path/IP had no scheduled cleanup of inactive keys.
- Fix: added periodic sweep for stale buckets in `_consume_rate_limit`.
- Reference:
  - `app/Code/main.py:266`

### 4) Upload UX blocked non-password PDFs

- Severity: Low
- File: `frontend/src/pages/UploadPage.tsx`
- Issue: frontend required a password for all PDFs, although backend supports empty-password parse attempts.
- Fix: removed forced password gate.
- Reference:
  - `frontend/src/pages/UploadPage.tsx:71`

### 5) Tooltip formula mismatch with backend logic

- Severity: Low
- Files:
  - `frontend/src/components/dashboard/TaxAnalysis.tsx`
  - `frontend/src/components/dashboard/Cost.tsx`
- Issue: explanatory text did not match backend semantics (`tax_free_gains`, `total_cost_paid`).
- Fix: aligned formulas/content to backend model outputs.
- References:
  - `frontend/src/components/dashboard/TaxAnalysis.tsx:101`
  - `frontend/src/components/dashboard/TaxAnalysis.tsx:128`
  - `frontend/src/components/dashboard/Cost.tsx:61`

### 6) Object URL cleanup missing in CSV exports

- Severity: Low
- Files:
  - `frontend/src/components/dashboard/HoldingsTable.tsx`
  - `frontend/src/components/dashboard/FundOverlap.tsx`
- Issue: `URL.createObjectURL` was not revoked after download.
- Fix: added `URL.revokeObjectURL(url)` post-click cleanup.
- References:
  - `frontend/src/components/dashboard/HoldingsTable.tsx:502`
  - `frontend/src/components/dashboard/FundOverlap.tsx:106`

## Remaining risks / discrepancies

### A) Large frontend production chunk

- Severity: Medium (performance)
- Evidence: build output reports ~1.41 MB minified JS main chunk.
- Impact: slower initial load on low bandwidth/devices.
- Recommendation: add route/section code splitting + manual chunks.

### B) Tooling/runtime mismatch warning

- Severity: Low
- Evidence: build warns Node `20.17.0` is below Vite's stated requirement (`20.19+` or `22.12+`).
- Recommendation: pin Node version in local/devops environments to a compatible version.

### C) In-memory rate limiting is process-local

- Severity: Low/Medium (depends on deployment scale)
- File: `app/Code/main.py`
- Impact: multi-instance deployments will not share limits.
- Recommendation: move to shared store (Redis) if strict global throttling is needed.

## Documentation updates delivered

- Added comprehensive codebase guide:
  - `docs/CODEBASE_DOCUMENTATION.md`
- Replaced placeholder frontend docs:
  - `frontend/Docs/README.md`
