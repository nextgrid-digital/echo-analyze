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
- Supabase-backed authentication
- One free CAS report per user, with Razorpay subscription unlock for unlimited analysis
- Admin page for Supabase admin users with log windows, user counts, and top users by report volume

## Documentation
- Repo operating guide: `AGENT.md`
- Frontend notes: `frontend/Docs/README.md`
- Supabase setup: `supabase/README.md`
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
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (backend only; required for report quotas/subscriptions and total Supabase user counts)
  - `SUPABASE_ADMIN_ROLE` (defaults to `admin`)
  - `SUPABASE_ADMIN_USER_IDS` or `SUPABASE_ADMIN_EMAILS` (optional allowlists)
  - `PDF_PARSE_EXECUTOR` (optional; defaults to `auto`; on Vercel, `auto` uses thread parsing to avoid child-process hangs)
  - `PDF_PARSE_TIMEOUT_SECONDS` (optional; defaults to `120`, capped between `1` and `240`)
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`
  - `RAZORPAY_PLAN_ID` (create a Razorpay Subscription Plan for Rs 1 while testing)
  - `RAZORPAY_WEBHOOK_SECRET`
  - `RAZORPAY_SUBSCRIPTION_TOTAL_COUNT` (defaults to `120`, Razorpay's 10-year maximum for monthly plans)
- Frontend-only Vite dev also supports `frontend/.env.local` with:
  - `APP_SUPABASE_URL`
  - `APP_SUPABASE_ANON_KEY`
  - `APP_SUPABASE_ADMIN_ROLE` (defaults to `admin`)

Admin access is granted only to Supabase users with `app_metadata.role = "admin"` by default.
The backend also supports explicit admin allowlists via `SUPABASE_ADMIN_USER_IDS` and
`SUPABASE_ADMIN_EMAILS`. Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend env files.

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

### 3. How auth and analytics work

- The React app signs users in with Supabase Auth and sends the Supabase access token to FastAPI.
- FastAPI verifies the token with Supabase before allowing analysis, PDF parsing, or admin APIs.
- FastAPI checks `public.profiles` before CAS analysis. New users get `cas_report_limit = 1` and `cas_reports_used = 0`.
- A successful free analysis consumes one report credit. Failed parsing or failed analysis refunds the reserved credit.
- Razorpay subscription checkout is available at `/pricing`. A subscription in `authenticated` or `active` status unlocks unlimited CAS analysis for that Supabase user.
- Browser clients can update only their profile username; report quotas, subscription columns, and billing RPCs are locked to the backend service role.
- Each analysis run stores summary analytics only. CAS files, parsed CAS reports, and uploaded filenames are not stored.
- The admin page shows usernames, report counts, active/total users, and logs filtered by recent 24 hours, 7 days, or 1 month.

To manually reset a user's free report quota in the Supabase SQL editor:

```sql
update public.profiles
set cas_reports_used = 0
where id = 'USER_UUID_HERE';
```

To manually grant unlimited access during testing:

```sql
update public.profiles
set subscription_status = 'active'
where id = 'USER_UUID_HERE';
```

## API Endpoints

- `GET /` - Portfolio Overview UI (home page)
- `GET /api/auth/me` - Return the authenticated Supabase user context
- `GET /api/billing/access` - Return report quota and subscription access for the authenticated user
- `POST /api/billing/create-subscription` - Create a Razorpay subscription for the authenticated user
- `POST /api/billing/verify-subscription-payment` - Verify Razorpay Checkout subscription payment signature
- `POST /api/billing/razorpay-webhook` - Receive Razorpay subscription webhooks
- `POST /api/analyze` - Analyze CAS file (PDF or JSON), requires Supabase auth
- `POST /api/parse_pdf` - Parse CAS PDF to JSON/Excel, requires Supabase auth
- `GET /api/admin/overview` - Admin analytics summary, requires Supabase admin access
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
- `vercel.json` routes `/api/*` and sensitive SPA paths (`/`, `/dashboard`, `/admin`, `/pricing`) through FastAPI so security/cache headers are applied before serving `static/index.html`.
- Admin data is protected by the backend Supabase admin check; the frontend route guard is only a UI convenience.
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
