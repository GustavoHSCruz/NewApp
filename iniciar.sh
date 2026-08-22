#!/usr/bin/env bash
# Clareia — caminho de uso para quem não é técnico.
# Prepara o ambiente na primeira vez, sobe a API e a interface e abre o navegador.
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "O Clareia precisa do Python 3. Instale em https://python.org e tente de novo."
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "O Clareia precisa do Node.js. Instale em https://nodejs.org e tente de novo."
  exit 1
fi

if [ ! -x .venv/bin/python ]; then
  echo "Preparando o Clareia pela primeira vez…"
  python3 -m venv .venv
fi

.venv/bin/pip install -q -r api/requirements.txt

if [ ! -d web/node_modules ]; then
  echo "Preparando a interface (isso só acontece na primeira vez)…"
  npm --prefix web install --no-audit --no-fund
fi

# A pessoa recebe a interface já compilada, não o servidor de desenvolvimento:
# abre mais rápido e não enche a janela de mensagens técnicas.
if [ "${CLAREIA_DEV:-0}" = "1" ]; then
  COMANDO_WEB=(npm --prefix web run dev)
else
  echo "Montando a interface…"
  npm --prefix web run build >/dev/null 2>&1
  COMANDO_WEB=(npm --prefix web run preview)
fi

encerrar() {
  echo ""
  echo "Fechando o Clareia. Até logo."
  kill "${API_PID:-}" "${WEB_PID:-}" 2>/dev/null || true
}
trap encerrar EXIT INT TERM

echo "Iniciando o Clareia…"
.venv/bin/uvicorn api.main:app --host 127.0.0.1 --port 8787 --log-level warning &
API_PID=$!
"${COMANDO_WEB[@]}" >/dev/null 2>&1 &
WEB_PID=$!

pronto=0
for _ in {1..60}; do
  if curl -fsS http://127.0.0.1:8787/api/saude >/dev/null 2>&1 \
    && curl -fsS http://127.0.0.1:5177/ >/dev/null 2>&1; then
    pronto=1
    break
  fi
  sleep 0.25
done

URL="http://127.0.0.1:5177"
if [ "$pronto" = "1" ]; then
  echo "Clareia aberto em $URL"
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then open "$URL" || true
  fi
else
  echo "O Clareia demorou mais que o esperado para abrir."
  echo "Tente acessar $URL no navegador. Se não abrir, feche esta janela e rode de novo."
fi

echo "Mantenha esta janela aberta enquanto usar o Clareia. Para encerrar, aperte Ctrl+C."
wait
