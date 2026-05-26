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
- Optional admin page with tracked users, run timings, and recent activity logs

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

## Configuration

### 1. Configure environment variables

- Backend: copy `.env.example` to `.env` and fill in:
  - `ENABLE_DEBUG_LOGS` (keep `false` unless you are temporarily debugging locally)
  - `ADMIN_ACCESS_ENABLED` (optional; defaults to disabled unless set to `true`)
  - `PDF_PARSE_EXECUTOR` (optional; defaults to `auto`; on Vercel, `auto` uses thread parsing to avoid child-process hangs)
  - `PDF_PARSE_TIMEOUT_SECONDS` (optional; defaults to `120`, capped between `1` and `240`)
- Frontend-only Vite dev also supports `frontend/.env.local` with:
  - `APP_ENABLE_ADMIN_ACCESS` (optional; set to `true` only when admin access should be visible)

Admin access is disabled by default. Set both backend `ADMIN_ACCESS_ENABLED=true` and frontend
`APP_ENABLE_ADMIN_ACCESS=true` when you intentionally want `/admin` available.

### 2. Run the app

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

### 3. How analytics works

- Each analysis run is stored in a lightweight SQLite analytics database.
- When admin access is enabled, `/admin` can show user counts, timings, and recent logs.

## API Endpoints

- `GET /` - Portfolio Overview UI (home page)
- `POST /api/analyze` - Analyze CAS file (PDF or JSON)
- `POST /api/parse_pdf` - Parse CAS PDF to JSON/Excel
- `GET /api/admin/overview` - Admin analytics summary, disabled unless admin access is enabled
- `GET /api/health` - Health check endpoint

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
- `vercel.json` routes `/api/*` to FastAPI and sends SPA paths (like `/dashboard`) to `static/index.html`.
- `/admin` is routed through FastAPI so the backend admin-access flag can hide or unlock it.
- The default analytics store is file-based. On Vercel, that falls back to `/tmp`, which is ephemeral. For production-grade admin analytics, point `ANALYTICS_DB_PATH` to persistent storage or swap the SQLite helper for a hosted database.

## Dependencies

- **fastapi** - Web framework
- **uvicorn** - ASGI server
- **httpx** - HTTP client for API calls
- **python-multipart** - File upload support
- **pydantic** - Data validation
- **casparser** - Repo-local vendored CAS PDF parser package
- **pdfminer-six** - PDF text extraction for CAS parsing
- **openpyxl** - Excel file support
- **xlrd** - Excel file reading

## Development

The server runs in reload mode by default, so any changes to Python files will automatically restart the server.

Debug logs are written to `data/backend_debug.log` only when `ENABLE_DEBUG_LOGS=true`.
CAS PDF parsing runs in an isolated worker when the host supports it and times out after
`PDF_PARSE_TIMEOUT_SECONDS` seconds, defaulting to `120`. `PDF_PARSE_EXECUTOR=auto` uses
the isolated subprocess locally and thread-based parsing on Vercel, where child processes can
hang without returning parser results.
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
