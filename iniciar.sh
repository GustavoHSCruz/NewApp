#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "O Clareia precisa do Python 3. Instale-o e tente novamente."
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "O Clareia precisa do Node.js. Instale-o em https://nodejs.org e tente novamente."
  exit 1
fi

if [ ! -x .venv/bin/python ]; then
  echo "Preparando o Clareia pela primeira vez…"
  python3 -m venv .venv
fi

.venv/bin/pip install -q -r api/requirements.txt
if [ ! -d web/node_modules ]; then
  echo "Preparando a interface…"
  npm --prefix web install --no-audit --no-fund
fi

encerrar() {
  kill "${API_PID:-}" "${WEB_PID:-}" 2>/dev/null || true
}
trap encerrar EXIT INT TERM

echo "Iniciando o Clareia…"
.venv/bin/uvicorn api.main:app --host 127.0.0.1 --port 8787 &
API_PID=$!
npm --prefix web run dev -- --host 127.0.0.1 &
WEB_PID=$!

for _ in {1..40}; do
  if curl -fsS http://127.0.0.1:8787/api/saude >/dev/null 2>&1 && curl -fsS http://127.0.0.1:5177/ >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

URL="http://127.0.0.1:5177"
echo "Clareia aberto em $URL"
if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then open "$URL" || true
fi
echo "Mantenha esta janela aberta. Para encerrar, pressione Ctrl+C."
wait
