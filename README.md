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
  - `EXPOSE_AUTH_DIAGNOSTICS` (optional local diagnostic; keep unset/false in production)
  - `PDF_PARSE_EXECUTOR` (optional; defaults to `auto`; on Vercel, `auto` uses thread parsing to avoid child-process hangs)
  - `PDF_PARSE_TIMEOUT_SECONDS` (optional; defaults to `120`, capped between `1` and `240`)
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
- `GET /api/payments/config` - Public Razorpay configuration (publishable key, plan id, currency)
- `POST /api/payments/create-order` - Create a one-time Razorpay order (Clerk auth)
- `POST /api/payments/create-subscription` - Create a recurring subscription (Clerk auth)
- `POST /api/payments/verify-payment` - Verify Razorpay checkout signature (Clerk auth)
- `GET /api/payments/subscriptions/{id}` - Fetch a subscription's current Razorpay state
- `POST /api/payments/subscriptions/{id}/cancel` - Cancel a subscription at the end of the cycle
- `POST /api/payments/webhook` - Razorpay webhook receiver (HMAC verified, no Clerk auth)

## Razorpay Billing

**Staging setup checklist:** [docs/RAZORPAY_STAGING_SETUP.md](docs/RAZORPAY_STAGING_SETUP.md) (₹2,000 + 18% GST = ₹2,360/month).

Echo supports Razorpay Standard Checkout for one-time payments and Razorpay Subscriptions
for monthly recurring billing. Configure these environment variables (e.g. on Vercel):

- `RAZORPAY_KEY_ID` - public key id (server only, never exposed to the SPA at build time)
- `RAZORPAY_KEY_SECRET` - secret key (server only, never sent to the browser)
- `RAZORPAY_WEBHOOK_SECRET` - webhook secret from the Razorpay dashboard (optional but
  required to accept `/api/payments/webhook` events)
- `RAZORPAY_PLAN_ID` - the `plan_id` of the monthly plan you created in Razorpay (required
  for the subscribe-monthly flow)
- `RAZORPAY_DEFAULT_AMOUNT_PAISE` - amount in paise (`236000` = ₹2,360 = ₹2,000 + 18% GST)
- `RAZORPAY_CURRENCY` - currency code, defaults to `INR`
- `RAZORPAY_PLAN_DESCRIPTION` - human-readable label shown on the billing page
- `RAZORPAY_SUBSCRIPTION_TOTAL_COUNT` - how many billing cycles to charge (default `12`)

### Charging a specific subscriber monthly

1. In the Razorpay dashboard, create a monthly plan: Subscriptions -> Plans -> New Plan with
   `period=monthly`, `interval=1`, and billing amount **₹2,360** (₹2,000 + 18% GST).
   Copy the plan id (`plan_...`). Set `RAZORPAY_DEFAULT_AMOUNT_PAISE=236000` to match.
2. Add the env vars above on Vercel and redeploy. The publishable key is delivered to the
   browser via `/api/payments/config` so it never has to be baked into the SPA bundle.
3. The subscriber signs in with Clerk, opens `/billing`, and clicks "Subscribe monthly".
   The backend calls Razorpay's `POST /v1/subscriptions` with the configured `plan_id`,
   tags the subscription with the Clerk user id in `notes.clerk_user_id`, and returns the
   `subscription_id`. The SPA then opens the Razorpay checkout modal using that id.
4. On the first successful payment, Razorpay returns `razorpay_payment_id`,
   `razorpay_subscription_id`, and `razorpay_signature`. The SPA posts those to
   `/api/payments/verify-payment`, which validates the HMAC-SHA256 signature
   (`HMAC(payment_id|subscription_id, KEY_SECRET)`) before treating the payment as paid.
5. Razorpay charges the saved instrument automatically every month from then on. Configure
   a webhook at `https://YOUR_DOMAIN/api/payments/webhook` (`subscription.charged`,
   `subscription.completed`, `subscription.cancelled`, `payment.failed`) and the backend
   records each event in the audit log so you can find them in `/admin`.
6. To stop billing a particular subscriber, call
   `POST /api/payments/subscriptions/{subscription_id}/cancel` (signed in as that user) or
   cancel from the Razorpay dashboard. By default the cancellation takes effect at the end
   of the current cycle so they keep access for what they already paid for.

### Static-site or backend-less deployments

This repo ships with FastAPI, so a backend is always available. If you fork this into a
pure-static deployment, do not call `/api/payments/*` from the browser without a backend -
the `KEY_SECRET` must stay server-side. In that case, host the endpoints as serverless
functions (Vercel/Netlify) or use Razorpay Payment Links instead of Standard Checkout.

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
- In production, `clerk_key_type` should normally be `live`. If it reports `test`, the deployment is
  using the development Clerk instance, so production-only providers such as Google may be missing
  until the Vercel environment variables are updated to the live publishable/secret keys.
- If the live Clerk instance uses a proxy URL, `/__clerk/*` is routed through FastAPI and forwarded
  to the runtime Clerk Frontend API with Clerk's required proxy headers. A 404 from `/__clerk/v1/*`
  means this route is not deployed yet or the deployment is serving an older `vercel.json`.
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
Public auth diagnostics such as backend secret presence are omitted from `/api/config` unless
`EXPOSE_AUTH_DIAGNOSTICS=true`.
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
