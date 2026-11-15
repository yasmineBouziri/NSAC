@echo off
title BSZ-OS (ASTRA Health)
cd /d "%~dp0bsz-os"
python runtime_bootstrap.py %*
if errorlevel 1 (
  echo.
  echo BSZ-OS could not start. Review the messages above.
  pause
)
