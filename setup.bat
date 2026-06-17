@echo off
REM One-step setup for the FB Marketplace -> KBB / CarComplaints extension (Windows).
REM Installs Bun (a small build tool) if needed, then builds the extension.
REM No programming knowledge required — double-click this file, then follow README Step 3.

setlocal
cd /d "%~dp0"

echo.
echo   FB Marketplace -^> KBB / CarComplaints - setup
echo   =============================================
echo.

where bun >nul 2>nul
if errorlevel 1 (
  if exist "%USERPROFILE%\.bun\bin\bun.exe" (
    set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
  ) else (
    echo   Installing Bun ^(a small build tool^)...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "irm bun.sh/install.ps1 | iex"
    set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
    echo.
  )
)

echo   Building the extension...
bun run build
if errorlevel 1 (
  echo.
  echo   Build failed - see the messages above.
  pause
  exit /b 1
)

echo.
echo   Done! Now load this folder into your browser ^(README Step 3^):
echo.
echo       %cd%\extension
echo.
pause
