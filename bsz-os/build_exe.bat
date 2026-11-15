@echo off
rem Builds dist\BSZ-OS.exe. Needs Python 3.10+ on Windows. Data folder is created next to the exe.
python runtime_bootstrap.py --check
if not exist ".venv\Scripts\python.exe" (
  echo Could not prepare the local Python environment.
  exit /b 1
)
.venv\Scripts\python.exe -m pip install --disable-pip-version-check --prefer-binary pyinstaller
.venv\Scripts\python.exe -m PyInstaller --onefile --noconsole --name BSZ-OS --collect-all llama_cpp --add-data "engines;engines" bsz.py
echo Done: dist\BSZ-OS.exe
