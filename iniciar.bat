@echo off
rem Clareia - caminho de uso para quem nao e tecnico.
setlocal
cd /d "%~dp0"

where python >nul 2>nul || (echo O Clareia precisa do Python 3. Instale em https://python.org & pause & exit /b 1)
where npm >nul 2>nul || (echo O Clareia precisa do Node.js. Instale em https://nodejs.org & pause & exit /b 1)

if not exist ".venv\Scripts\python.exe" (
  echo Preparando o Clareia pela primeira vez...
  python -m venv .venv || (pause & exit /b 1)
)

".venv\Scripts\python.exe" -m pip install -q -r api\requirements.txt || (pause & exit /b 1)

if not exist "web\node_modules" (
  echo Preparando a interface ^(isso so acontece na primeira vez^)...
  call npm --prefix web install --no-audit --no-fund || (pause & exit /b 1)
)

echo Montando a interface...
call npm --prefix web run build >nul || (pause & exit /b 1)

start "Clareia - programa" /min cmd /c "".venv\Scripts\python.exe" -m uvicorn api.main:app --host 127.0.0.1 --port 8787 --log-level warning"
start "Clareia - interface" /min cmd /c "npm --prefix web run preview"

echo Abrindo o Clareia...
timeout /t 5 /nobreak >nul
start "" http://127.0.0.1:5177

echo.
echo O Clareia esta aberto em http://127.0.0.1:5177
echo Para encerrar, feche as duas janelas chamadas "Clareia".
pause
