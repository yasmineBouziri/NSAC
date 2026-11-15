@echo off
cd /d "%~dp0"
python runtime_bootstrap.py %*
if errorlevel 1 (
  echo.
  echo BSZ-OS could not start. Review the message above.
  pause
)
