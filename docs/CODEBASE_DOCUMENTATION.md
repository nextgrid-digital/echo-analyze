# Echo-Analyze Codebase Documentation

Last updated: 2026-03-08

## 1) What this project does

Echo-Analyze ingests a mutual fund CAS file (`.pdf` or compatible `.json`) and returns:

- normalized holding-level data
- portfolio/benchmark return analytics (including XIRR)
- allocation and concentration breakdowns
- estimated cost/tax summaries
- benchmark coverage warnings and overlap matrix (when real holdings are available)

The app is a FastAPI backend plus a React/Vite dashboard frontend.

## 2) High-level architecture

### Runtime components

- Backend API: FastAPI app in `app/Code/main.py`
- Frontend SPA: React app in `frontend/src`, built into `static/`
- Static hosting: FastAPI mounts `static/` and Vercel routes SPA + API

### Source-of-truth modules

`app/*.py` files are thin re-export wrappers. Actual backend implementation is in:

- `app/Code/main.py`
- `app/Code/cas_parser.py`
- `app/Code/utils.py`
- `app/Code/holdings.py`
- `app/Code/overlap.py`

## 3) Directory map

```text
app/
  main.py                 # thin wrapper -> app.Code.main
  Code/
    main.py               # FastAPI endpoints + analysis pipeline + response models
    cas_parser.py         # CAS PDF parse + JSON->Excel conversion
    utils.py              # NAV/NAV history fetch + cache + XIRR
    holdings.py           # external holdings sourcing for overlap
    overlap.py            # overlap matrix computation
frontend/
  src/
    api/analyze.ts        # API client
    types/api.ts          # backend contract mirror
    pages/                # upload + dashboard routes
    components/dashboard/ # dashboard sections/cards/charts/tables
static/                   # built frontend assets served in prod
tests/
  test_security_accuracy.py
  fixtures/sample_cas.json
```

## 4) Backend API

### Endpoints

- `POST /api/analyze`
  - accepts multipart file upload (`pdf` or `json`) + optional password
  - returns `AnalysisResponse` (holding list + summary + warnings)
- `POST /api/parse_pdf`
  - parses CAS PDF
  - returns JSON or Excel stream (`output_format=excel`)
- `GET /api/health`
  - health check
- `GET /`
  - serves SPA entry (`static/index.html`)

## 5) Analysis pipeline (backend)

Implemented in `map_casparser_to_analysis` (`app/Code/main.py`):

1. Parse folios/schemes/transactions.
2. Classify category/sub-category via keyword + type heuristics.
3. Prefetch:
   - live NAV for scheme AMFI codes
   - NAV history for scheme + benchmark proxy codes
4. Build scheme/portfolio cashflows.
5. Compute:
   - holding XIRR
   - portfolio XIRR
   - benchmark XIRR (proxy based)
   - 1Y/3Y performance gap buckets
6. Build asset allocation, concentration, market-cap and fixed-income summaries.
7. Compute lot-level equity tax buckets + debt tax proxy estimate.
8. Fetch real holdings (external API / AMFI / Groww) for overlap matrix.
9. Attach coverage and methodology warnings.

## 6) Core calculation notes

- XIRR uses bracketed bisection in `app/Code/utils.py` (`calculate_xirr`) and returns `None` if no stable root is found.
- Benchmark series are proxy-based; mapping logic is in `_resolve_benchmark_components` (`main.py`).
- Overlap formula in `app/Code/overlap.py`:
  - `Overlap(A, B) = sum(min(weightA[s], weightB[s]))` across common constituents
- Tax in current model is indicative:
  - equity STCG / LTCG with exemption
  - debt taxed via configurable slab proxy (`DEBT_TAX_RATE_PCT`)

## 7) Security controls implemented

Backend middleware in `app/Code/main.py` provides:

- file type + size + content-signature validation
- optional API key auth (`ECHO_ANALYZE_API_KEY`)
- rate limiting for protected endpoints
- security headers (CSP, frame, referrer, nosniff, permissions)
- basic PII redaction for debug logs

Client-IP extraction for rate limiting now supports a trust boundary:

- `TRUST_PROXY_CLIENT_IP=true` to trust `X-Forwarded-For`/`X-Real-IP`
- otherwise use socket client IP

## 8) Caching/external dependencies

### NAV cache (`app/Code/utils.py`)

- disk file: `data/nav_cache.json`
- in-memory + disk cache
- NAV cache is daily
- NAV history TTL defaults to 1 day (`HISTORY_CACHE_TTL_DAYS`)

### Holdings cache (`app/Code/holdings.py`)

- disk file: `data/amfi_cache.json`
- AMFI monthly report cache + failed URL cache + Groww scheme slug cache

## 9) Environment variables

### Backend behavior

- `ENABLE_DEBUG_LOGS` (`true/false`)
- `AUTO_SYNC_FRONTEND` (`true/false`)
- `CORS_ALLOW_ORIGINS` (comma-separated)
- `ENABLE_TEST_ENDPOINT` (`true/false`)

### Security/rate limit

- `ECHO_ANALYZE_API_KEY`
- `ANALYZE_RATE_LIMIT_ENABLED` (`true/false`)
- `ANALYZE_RATE_LIMIT_PER_MIN` (int)
- `ANALYZE_RATE_LIMIT_WINDOW_SEC` (int)
- `TRUST_PROXY_CLIENT_IP` (`true/false`)

### Financial assumptions

- `DEBT_TAX_RATE_PCT` (float, default `30.0`)

### External data/cache

- `HISTORY_CACHE_TTL_DAYS` (int, default `1`)
- `HOLDINGS_API_URL` (optional custom holdings source)
- `VERCEL` (platform-provided)

## 10) Frontend contract and flow

- API client: `frontend/src/api/analyze.ts`
- types mirror backend pydantic models: `frontend/src/types/api.ts`
- routes:
  - `/` upload page
  - `/dashboard` dashboard page (expects route state result)
- dashboard is composition-based (`Dashboard.tsx`) with section components.

## 11) Testing and quality checks

### Backend

- `python -m unittest discover -s tests -p "test_*.py" -v`
- focuses on:
  - security sanitization
  - benchmark mapping
  - tax/set-off logic
  - overlap behavior
  - regression checks

### Frontend

- `npm run lint`
- `npm test -- --run`
- `npm run build`

## 12) Deployment notes

- Vercel routes `/api/*` to `app/Code/main.py`
- SPA assets served from `static/`
- Frontend build emits into `../static` (configured via Vite)

## 13) Known limitations (current design)

- some metrics are intentionally heuristic/indicative (risk proxies, debt tax proxy, benchmark proxies)
- overlap depends on external holdings data availability
- rate limiting is in-process memory (not shared across multiple instances)
- large frontend bundle warning remains (chunking optimization pending)
