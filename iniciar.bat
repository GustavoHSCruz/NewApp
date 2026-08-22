@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul || (echo O Clareia precisa do Python 3. Instale em https://python.org & pause & exit /b 1)
where npm >nul 2>nul || (echo O Clareia precisa do Node.js. Instale em https://nodejs.org & pause & exit /b 1)

if not exist ".venv\Scripts\python.exe" python -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install -q -r api\requirements.txt || exit /b 1
if not exist "web\node_modules" call npm --prefix web install --no-audit --no-fund || exit /b 1

start "Clareia API" /min cmd /c ".venv\Scripts\python.exe -m uvicorn api.main:app --host 127.0.0.1 --port 8787"
start "Clareia Web" /min cmd /c "npm --prefix web run dev -- --host 127.0.0.1"
timeout /t 3 /nobreak >nul
start "" http://127.0.0.1:5177
echo Clareia iniciado. Esta janela pode ser fechada.
