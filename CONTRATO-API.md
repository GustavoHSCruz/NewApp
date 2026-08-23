# Contrato HTTP — Clareia

Contrato acordado entre Codex (API) e Claude (web). JSON em UTF-8, datas civis em `AAAA-MM-DD`, timestamps ISO 8601 UTC. API em `http://127.0.0.1:8787`; web em `http://127.0.0.1:5177`.

## Tipos

```ts
type Passo = {
  id: string; titulo: string; detalhe: string; data_prevista: string;
  concluido_em: string | null; ordem: number; ancora: boolean;
};
type Plano = {
  id: string; titulo: string; descricao: string; categoria: string;
  prazo_final: string; criado_em: string; passos: Passo[];
  total: number; concluidos: number;
};
type ResumoPlano = Omit<Plano, "passos"> & { proximo_passo: Passo | null };
type Erro = { erro: { codigo: string; mensagem: string } };
```

## Rotas

- `GET /api/saude` → `{ "versao": "1.0.0", "ollama": boolean }`.
- `GET /api/licenca` → estado Apoiador, checkout configurado e preço; `POST /api/licenca` ativa uma chave offline; `DELETE` desativa localmente.
- `POST /api/planos/preparar` recebe `{ descricao, prazo_final }` e retorna `{ categoria, titulo_sugerido, perguntas: [{ id, rotulo, tipo, opcoes, obrigatoria }] }`.
- `POST /api/planos` recebe `{ descricao, prazo_final, categoria?, titulo?, respostas?: Record<string, unknown>, usar_ollama?: boolean }` e retorna `Plano` (201). O motor distribui os passos até o prazo.
- `GET /api/planos?q=&status=` → `ResumoPlano[]`; status: `ativos`, `concluidos` ou `todos`.
- `GET /api/planos/{id}` → `Plano`.
- `PATCH /api/planos/{id}` recebe qualquer subconjunto de `{ titulo, descricao, prazo_final }` → `Plano`. Alterar prazo redistribui apenas passos flexíveis pendentes.
- `DELETE /api/planos/{id}` → 204.
- `POST /api/planos/{id}/passos` recebe `{ titulo, detalhe?, data_prevista?, ancora? }` → `Passo` (201).
- `PATCH /api/planos/{id}/passos/{passo_id}` recebe qualquer subconjunto de `{ titulo, detalhe, data_prevista, concluido, ancora }` → `Passo`.
- `DELETE /api/planos/{id}/passos/{passo_id}` → 204.
- `POST /api/planos/{id}/passos/{passo_id}/adiar` recebe `{ dias: number }` → `Passo`. Limita a nova data ao prazo final e não altera passos âncora.
- `PUT /api/planos/{id}/ordem` recebe `{ passos: string[] }` contendo todos os IDs uma vez → `Plano`.
- `GET /api/agenda?de=AAAA-MM-DD&ate=AAAA-MM-DD` → `{ atrasados: ItemAgenda[], periodo: ItemAgenda[] }`; cada item é um `Passo` acrescido de `{ plano_id, plano_titulo, prazo_final }`. O padrão é hoje até hoje + 7 dias.
- `GET /api/planos/{id}/exportacao?formato=markdown|html|ics&capa=false` → arquivo. Calendário e capa são Apoiador.
- `GET/POST /api/modelos`, `POST /api/modelos/{id}/usar`, `DELETE /api/modelos/{id}` → modelos próprios Apoiador.

## Regras comuns

- Erros têm sempre o formato `Erro`, com mensagens em pt-BR.
- `404` para recurso ausente; `422` para entrada inválida; `409` para operação incompatível com o estado.
- CORS aceita `http://localhost:5177` e `http://127.0.0.1:5177` em desenvolvimento.
- Campos desconhecidos são rejeitados. Textos são aparados e têm limites razoáveis.
- O armazenamento é local em SQLite; nenhuma telemetria ou envio externo. Ollama é opcional, local, e só é usado quando solicitado.
