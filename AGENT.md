# AGENT.md

## Overview

Echo Analyze is a Mutual Fund CAS analysis app with:

- FastAPI backend for parsing CAS PDFs/JSON and computing portfolio analytics
- React/Vite frontend that renders the dashboard and exports a PDF snapshot
- Vercel deployment that serves `app/Code/main.py` for `/api/*` and static assets from `static/`

## Runtime Entry Points

- Backend entry shim: `app/main.py`
- Real backend app: `app/Code/main.py`
- Frontend source: `frontend/src/`
- Deployed frontend assets: `static/`

Important: top-level helper modules under `app/` are shims that re-export `app/Code/*`. When changing backend logic, update the `app/Code/` files.

## Backend Map

- `app/Code/main.py`: FastAPI routes, Pydantic response models, portfolio analysis pipeline
- `app/Code/cas_parser.py`: CAS PDF parsing and Excel export helpers
- `app/Code/utils.py`: NAV/history fetchers, cache persistence, XIRR solver
- `app/Code/holdings.py`: overlap holdings sourcing from configured API, AMFI disclosures, and Groww fallbacks
- `app/Code/overlap.py`: overlap matrix calculation

## Frontend Map

- `frontend/src/pages/UploadPage.tsx`: file upload flow and analyze action
- `frontend/src/pages/DashboardPage.tsx`: dashboard shell, notices modal, PDF export
- `frontend/src/components/dashboard/`: dashboard cards, sections, charts
- `frontend/src/lib/portfolioAnalysis.ts`: UI-only grouping and methodology notices
- `frontend/src/types/api.ts`: TypeScript mirror of the backend response contract

## Local Commands

Backend checks:

```powershell
venv\Scripts\python.exe -m unittest -q tests.test_security_accuracy
```

Frontend checks:

```powershell
cd frontend
npm test -- --run
npm run build
```

Run locally:

```powershell
run_local.bat
```

## Data, Caches, and Environment

- Disk caches live in `data/`
- Debug logging goes to `data/backend_debug.log` when `ENABLE_DEBUG_LOGS=true`
- CORS origins come from `CORS_ALLOW_ORIGINS`
- Optional holdings API endpoint comes from `HOLDINGS_API_URL`
- Vercel routes `/api/*` to `app/Code/main.py` and expects `static/` to be up to date

## Maintenance Notes

- Rebuild `static/` from `frontend/` after frontend changes that need deployment.
- Keep backend and frontend response models in sync when adding summary fields.
- Treat benchmark paths and overlap holdings as best-effort data sources; warnings are part of the contract, not incidental UI text.
- If dashboard behavior changes, update both the regression tests and this file so future audits stay grounded in the current architecture.
