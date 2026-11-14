@echo off
rem Builds dist\BSZ-OS.exe. Needs Python 3.10+ on Windows. Data folder is created next to the exe.
pip install pyinstaller
pyinstaller --onefile --noconsole --name BSZ-OS --add-data "engines;engines" bsz.py
echo Done: dist\BSZ-OS.exe
