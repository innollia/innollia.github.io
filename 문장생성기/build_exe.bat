@echo off
echo ==============================================
echo Sentence Generator Auto Build Script
echo ==============================================
echo.

echo 1. Installing PyInstaller if missing...
pip install pyinstaller
echo.

echo 2. Building .exe file...
pyinstaller --onefile --add-data "prompts;prompts" --add-data "*.json;." --add-data "theme_pool.py;." sentence.py

echo.
echo ==============================================
echo Build completed! Check the 'dist' folder for sentence.exe.
echo ==============================================
pause
