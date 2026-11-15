@echo off
setlocal
rem Builds dist\BSZ-OS.exe. Needs Python 3.10-3.12 on Windows. Data folder is created next to the exe.
cd /d "%~dp0"

set "PY_EXE="
if exist ".venv\Scripts\python.exe" set "PY_EXE=.venv\Scripts\python.exe"
if not defined PY_EXE if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PY_EXE=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
if not defined PY_EXE (
  py -3.12 -c "import sys" >nul 2>&1 && (
    for /f "delims=" %%i in ('py -3.12 -c "import sys; print(sys.executable)"') do set "PY_EXE=%%i"
  )
)
if not defined PY_EXE set "PY_EXE=python"

"%PY_EXE%" runtime_bootstrap.py --check
if not exist ".venv\Scripts\python.exe" (
  echo Could not prepare the local Python environment.
  exit /b 1
)
.venv\Scripts\python.exe -m pip install --disable-pip-version-check --prefer-binary pyinstaller
.venv\Scripts\python.exe -m PyInstaller --onefile --noconsole --name BSZ-OS --collect-all llama_cpp --add-data "engines;engines" --add-data "web;web" bsz.py
echo Done: dist\BSZ-OS.exe
