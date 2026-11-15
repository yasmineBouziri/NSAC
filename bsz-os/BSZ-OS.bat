@echo off
setlocal
title BSZ-OS (ASTRA Health)
if not defined BSZ_AI_GPU_LAYERS set BSZ_AI_GPU_LAYERS=-1
cd /d "%~dp0"

set "PY_EXE="
if exist ".venv-x64-runtime\Scripts\python.exe" set "PY_EXE=.venv-x64-runtime\Scripts\python.exe"
if not defined PY_EXE if exist ".venv\Scripts\python.exe" set "PY_EXE=.venv\Scripts\python.exe"
if not defined PY_EXE if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PY_EXE=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
if not defined PY_EXE for /f "delims=" %%i in ('py -3.12 -c "import sys; sys.stdout.write(sys.executable)" 2^>nul') do set "PY_EXE=%%i"
if not defined PY_EXE for /f "delims=" %%i in ('py -3.11 -c "import sys; sys.stdout.write(sys.executable)" 2^>nul') do set "PY_EXE=%%i"
if not defined PY_EXE for /f "delims=" %%i in ('py -3.10 -c "import sys; sys.stdout.write(sys.executable)" 2^>nul') do set "PY_EXE=%%i"
if not defined PY_EXE set "PY_EXE=python"

"%PY_EXE%" runtime_bootstrap.py %*
if errorlevel 1 (
  echo.
  echo BSZ-OS could not start. Review the message above.
  pause
)
