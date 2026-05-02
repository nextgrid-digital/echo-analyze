# Echo-Analyze - Mutual Fund Portfolio Analyzer

A FastAPI-based application for analyzing mutual fund portfolios from CAS (Consolidated Account Statement) files.

## Features

- Parse CAS PDF files with password support
- Analyze portfolio holdings with XIRR calculations
- Calculate benchmark comparisons (UTI Nifty 50)
- Portfolio overlap analysis
- Asset allocation and concentration metrics
- Fixed income analysis
- Performance tracking
- Clerk-backed user authentication for protected analysis routes
- Admin page with tracked users, run timings, and recent activity logs

## Documentation
- Repo operating guide: `AGENT.md`
- Frontend notes: `frontend/Docs/README.md`
## Quickstart (Windows)

### Option 1: Using the Batch Script (Easiest)

Simply double-click `run_local.bat` or run it from command prompt:

```cmd
run_local.bat
```


This will:
1. Create a virtual environment (if doesnt exists)
2. Install all dependencies
3. Start the development server at http://localhost:8000

### Option 2: Manual Setup

1. **Create a virtual environment:**
   ```cmd
   python -m venv venv
   ```

2. **Activate the virtual environment:**
   ```cmd
   venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```cmd
   pip install -r requirements.txt
   ```

4. **Create data directory:**
   ```cmd
   mkdir data
   ```

5. **Run the server:**
   ```cmd
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

6. **Open your browser:**
   Navigate to http://localhost:8000

## Clerk Setup

### 1. Create a Clerk application

1. Create or open your app in the Clerk dashboard.
2. Enable the sign-in methods you want, such as email/password or Google.
3. Copy the publishable key and secret key from Clerk.

### 2. Configure environment variables

- Backend: copy `.env.example` to `.env` and fill in:
  - `CLERK_SECRET_KEY`
  - `VITE_CLERK_PUBLISHABLE_KEY` or `CLERK_PUBLISHABLE_KEY`
  - `CLERK_JWT_KEY` (optional, recommended if you want networkless verification)
  - `CLERK_ADMIN_USER_IDS`
  - `CLERK_ALLOWED_PARTIES`
  - `CLERK_ALLOWED_ISSUERS` (optional, recommended; comma-separated Clerk issuer URLs)
  - `CLERK_REQUIRE_AZP` (recommended `true` when your tokens include `azp`; set to `false` only for legacy tokens that omit it)
  - `ENABLE_DEBUG_LOGS` (keep `false` unless you are temporarily debugging locally)
- Frontend-only Vite dev also supports `frontend/.env.local` with:
  - `VITE_CLERK_PUBLISHABLE_KEY`

`CLERK_ADMIN_USER_IDS` should contain one or more Clerk user IDs separated by commas. Those users can open `/admin`.

### 3. Run the app

1. Start the FastAPI app from the repo root.
2. For local frontend development, run Vite from `frontend/`:
   ```cmd
   cd frontend
   npm install
   npm run dev
   ```
3. Or build the frontend into `static/` and serve everything from FastAPI:
   ```cmd
   cd frontend
   npm run build
   ```

### 4. How the auth flow works

- The React app signs users in with Clerk.
- The app reads the Clerk publishable key from `/api/config` at runtime, so local FastAPI and Vercel deployments use the currently configured environment instead of a stale value baked into `static/`.
- Protected API calls attach a Clerk session token from the frontend.
- FastAPI verifies that token against Clerk JWKS before allowing `/api/analyze`, `/api/parse_pdf`, `/api/auth/me`, or `/api/admin/overview`.
- If you set `CLERK_JWT_KEY`, FastAPI can verify tokens without fetching JWKS on each cache refresh.
- Each analysis run is stored in a lightweight SQLite analytics database so `/admin` can show user counts, timings, and recent logs.

## API Endpoints

- `GET /` - Portfolio Overview UI (home page)
- `POST /api/analyze` - Analyze CAS file (PDF or JSON), requires Clerk auth
- `POST /api/parse_pdf` - Parse CAS PDF to JSON/Excel, requires Clerk auth
- `GET /api/auth/me` - Return current authenticated user and admin access
- `GET /api/admin/overview` - Admin analytics summary, requires admin access
- `GET /api/health` - Health check endpoint
- `GET /test` - Test API endpoint

## Project Structure

```
echo-analyze/
|-- app/
|   |-- Code/
|   |   \-- main.py          # Main FastAPI application
|   |-- cas_parser.py         # CAS file parser
|   |-- holdings.py           # Holdings data fetcher
|   |-- overlap.py            # Portfolio overlap calculator
|   |-- utils.py              # Utility functions (NAV, XIRR)
|   \-- main.py             # App entry point
|-- static/
|   \-- index.html          # Frontend UI
|-- data/                     # Log files directory
|-- requirements.txt          # Python dependencies
\-- run_local.bat           # Windows startup script
```

## Deployment Note (Vercel)

- The deployed UI is served from `static/` (not directly from `frontend/src`).
- Before deploying, rebuild frontend assets so `static/` stays in sync:
  ```cmd
  cd frontend
  npm run build
  ```
- `vercel.json` routes `/api/*` to FastAPI and sends SPA paths (like `/dashboard` and `/admin`) to `static/index.html`.
- After deploying, check `https://YOUR_DOMAIN/api/config`. It should return the Clerk key type,
  frontend API domain, and `clerk_frontend_api_resolves: true`. A live Clerk key encodes the
  production Frontend API host, so DNS for that host must resolve before Clerk can load.
- The default analytics store is file-based. On Vercel, that falls back to `/tmp`, which is ephemeral. For production-grade admin analytics, point `ANALYTICS_DB_PATH` to persistent storage or swap the SQLite helper for a hosted database.

## Dependencies

- **fastapi** - Web framework
- **uvicorn** - ASGI server
- **httpx** - HTTP client for API calls
- **python-multipart** - File upload support
- **pydantic** - Data validation
- **PyJWT[crypto]** - Clerk session token verification
- **casparser** - Repo-local vendored CAS PDF parser package
- **pdfminer-six** - PDF text extraction for CAS parsing
- **openpyxl** - Excel file support
- **xlrd** - Excel file reading

## Development

The server runs in reload mode by default, so any changes to Python files will automatically restart the server.

Debug logs are written to `data/backend_debug.log` only when `ENABLE_DEBUG_LOGS=true`.
Analysis analytics are stored in `data/app_analytics.db` by default.

## Troubleshooting

### Port Already in Use
If port 8000 is already in use, you can change it in the startup command:
```cmd
uvicorn app.main:app --reload --host 127.0.0.1 --port 8080
```

### Python Not Found
Ensure Python 3.10+ is installed and added to your system PATH.

### Dependencies Installation Failed
Try upgrading pip first:
```cmd
python -m pip install --upgrade pip
```

Then retry installing dependencies.
