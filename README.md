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

## Quick Start (Windows)

### Option 1: Using the Batch Script (Easiest)

Simply double-click `run_local.bat` or run it from command prompt:

```cmd
run_local.bat
```

This will:
1. Create a virtual environment (if not exists)
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
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

6. **Open your browser:**
   Navigate to http://localhost:8000

## API Endpoints

- `GET /` - Portfolio Overview UI (home page)
- `POST /api/analyze` - Analyze CAS file (PDF or JSON)
- `POST /api/parse_pdf` - Parse CAS PDF to JSON/Excel
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
- `vercel.json` routes `/api/*` to FastAPI and sends SPA paths (like `/dashboard`) to `static/index.html`.

## Dependencies

- **fastapi** - Web framework
- **uvicorn** - ASGI server
- **httpx** - HTTP client for API calls
- **python-multipart** - File upload support
- **pydantic** - Data validation
- **casparser** - CAS PDF parser
- **openpyxl** - Excel file support
- **xlrd** - Excel file reading

## Development

The server runs in reload mode by default, so any changes to Python files will automatically restart the server.

When running `uvicorn app.main:app`, the UI served at `http://localhost:8000` comes from `static/`.
To avoid stale UI, backend now auto-builds frontend (`frontend -> static`) on page requests when source files are newer.
You can disable this with:
```cmd
set AUTO_SYNC_FRONTEND=0
```

Debug logs are written to `data/backend_debug.log`.

## Troubleshooting

### Port Already in Use
If port 8000 is already in use, you can change it in the startup command:
```cmd
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

### Python Not Found
Ensure Python 3.7+ is installed and added to your system PATH.

### Dependencies Installation Failed
Try upgrading pip first:
```cmd
python -m pip install --upgrade pip
```

Then retry installing dependencies.
