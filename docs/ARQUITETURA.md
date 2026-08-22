# Arquitetura do Clareia

O produto tem duas aplicações independentes. `web/` é a interface React/TypeScript na porta 5177; `api/` é a API FastAPI na porta 8787. A única fronteira entre elas é o contrato HTTP documentado em `CONTRATO-API.md`.

Os dados ficam no SQLite em `api/dados/clareia.db`. Planos e passos usam exclusão em cascata e índices por plano/data. Não há autenticação porque o serviço escuta apenas na interface local por padrão, não há conta, sincronização ou telemetria.

O motor classifica descrições por gatilhos e usa modelos locais para gerar um ponto de partida consistente. Datas são distribuídas do dia atual até o prazo final. O último passo é uma âncora rígida; os anteriores são flexíveis. O Ollama, se estiver disponível, pode enriquecer a lista quando solicitado, mas falhas ou ausência sempre recaem no motor determinístico.

## Desenvolvimento

```bash
python3 -m venv .venv
.venv/bin/pip install -r api/requirements.txt
.venv/bin/uvicorn api.main:app --reload --port 8787
cd web && npm install && npm run dev
```

A documentação interativa da API fica em `http://127.0.0.1:8787/api/docs`.
