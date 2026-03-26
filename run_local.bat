@echo off
echo ========================================
echo Echo-Analyze Local Development Server
echo ========================================
echo.

REM Check if virtual environment exists
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo Error: Failed to create virtual environment
        echo Please ensure Python is installed and in PATH
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo.
echo Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

REM Create data directory if it doesn't exist
if not exist data mkdir data

REM Start the server
echo.
echo ========================================
echo Starting FastAPI server...
echo Server will be available at: http://localhost:8000
echo ========================================
echo.
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause
