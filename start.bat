@echo off
REM One-click start for the legal case-management platform (Windows).
REM Requires Docker Desktop installed and running. After startup:
REM   UI:  http://localhost:5173
REM   API: http://localhost:8000
cd /d "%~dp0"

where docker >nul 2>nul
if errorlevel 1 (
  echo Docker is not installed. Install Docker Desktop from:
  echo https://www.docker.com/products/docker-desktop/
  echo Or see QUICKSTART.md for manual setup instructions.
  pause
  exit /b 1
)

if defined ANTHROPIC_API_KEY (
  echo Anthropic API key detected - AI drafting and research will be active.
) else (
  echo NOTE: ANTHROPIC_API_KEY is not set. Everything works except AI drafting
  echo and research, which will return a clear error. For full functionality run:
  echo   set ANTHROPIC_API_KEY=sk-ant-... ^&^& start.bat
)

docker compose up --build
