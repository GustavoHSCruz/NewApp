# web — a interface do Clareia

Aplicação React + Vite + TypeScript. Fala com a API apenas por HTTP, seguindo
o `CONTRATO-API.md` da raiz. Não conhece o banco nem a lógica de plano.

- `npm run dev` — desenvolvimento, esperando a API em `http://127.0.0.1:8787`
- `npm run dev:mock` — desenvolvimento sem a API, usando `src/api/mock.ts`
- `npm run build` — gera `dist/`, que é o que a pessoa usa de verdade

Para usar o Clareia normalmente, não entre aqui: rode `iniciar.sh` (ou
`iniciar.bat`) na pasta de cima.
