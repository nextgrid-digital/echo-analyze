# Frontend Documentation

Last updated: 2026-03-08

## Overview

The frontend is a React + TypeScript single-page app that:

- uploads CAS files (`.pdf`/`.json`) to `/api/analyze`
- renders a multi-section analysis dashboard
- supports CSV/PDF/image export for key sections

Build toolchain: Vite + ESLint + Vitest.

## Main files

- `src/pages/UploadPage.tsx`: file upload and analysis trigger
- `src/pages/DashboardPage.tsx`: top-level dashboard route and export controls
- `src/components/dashboard/Dashboard.tsx`: section composition/layout
- `src/types/api.ts`: backend response contract mirror
- `src/api/analyze.ts`: API transport client
- `src/lib/portfolioAnalysis.ts`: allocation/coverage helper logic used by multiple sections

## Data flow

1. User selects file on upload page.
2. `analyzePortfolio()` posts multipart form to `/api/analyze`.
3. Response (`AnalysisResponse`) is passed via route state to `/dashboard`.
4. Dashboard sections read the same `summary` + `holdings` objects and render independently.

## Testing and linting

- `npm run lint`
- `npm test -- --run`
- `npm run build`

## Notes

- Backend is source-of-truth for financial calculations and warning generation.
- Frontend should avoid introducing alternative financial formulas; display text/tooltips should remain aligned with backend semantics.
