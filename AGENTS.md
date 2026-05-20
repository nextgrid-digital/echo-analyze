# AGENTS.md

See `AGENT.md` for full repo overview, backend/frontend maps, and local commands.

## Cursor Cloud specific instructions

### Services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| FastAPI backend | `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000` | 8000 | Serves API and built SPA from `static/` |
| Vite dev server | `cd frontend && npm run dev` | 5173 | Proxies `/api` to `:8000`; only needed for frontend development |

### Running tests

Backend tests and checks (run from repo root):
```
python3 -m unittest -q tests.test_security_accuracy
python3 -m compileall -q app casparser tests
python3 -m bandit -r app casparser -x "*/__pycache__/*" -f txt
```

Frontend checks (run from `frontend/`):
```
npm run lint
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
npm test -- --run
npm run build
```

### Gotchas

- `~/.local/bin` must be on `PATH` for `uvicorn` and other pip-installed scripts. The update script handles this.
- The `.env` file must exist at the repo root (copy `.env.example` → `.env`). Without Clerk keys, only `/api/health` and `/api/config` work; all protected routes return 401.
- The `data/` directory is created automatically by the backend if missing, but `mkdir -p data` in setup avoids first-run warnings.
- `vite.config.ts` uses `envPrefix: "APP_"`, not `"VITE_"`. The Clerk publishable key is fetched at runtime from `/api/config`, not baked in by Vite.
- One pre-existing test failure exists: `test_sanitize_file_name_redacts_path_and_sensitive_tokens` — this is a known issue in the repo, not an environment problem.
- Node >=20.19 is required (see `frontend/package.json` engines field).
- The `casparser/` directory is a vendored fork used directly by the backend; it is not installed as a separate package.
