# Clareia

Transforme algo difícil de organizar em passos pequenos, com datas e uma tela simples que mostra **o que fazer hoje**.

Você descreve uma situação com suas palavras — mudança, entrevista, documentos, viagem, evento ou qualquer outro objetivo — e informa o prazo. O Clareia prepara um plano, distribui as etapas e permite concluir, editar, reordenar ou adiar cada passo. Tudo fica somente no seu computador.

## Como usar

Você precisa ter [Python 3](https://www.python.org/downloads/) e [Node.js](https://nodejs.org/) instalados.

### Linux ou macOS

1. Abra esta pasta.
2. Dê dois cliques em `iniciar.sh` ou execute `./iniciar.sh`.
3. Na primeira vez, aguarde a preparação. O navegador abrirá sozinho.

### Windows

1. Abra esta pasta.
2. Dê dois cliques em `iniciar.bat`.
3. Na primeira vez, aguarde a preparação. O navegador abrirá sozinho.

Depois, use **Novo plano**, responda às perguntas curtas e acompanhe a tela **Hoje**. Mantenha a janela do inicializador aberta enquanto estiver usando. Seus dados ficam em `api/dados/clareia.db`; copiar esse arquivo faz um backup.

## Privacidade e IA local

Não há cadastro, telemetria ou nuvem. Se o [Ollama](https://ollama.com/) já estiver funcionando no computador, a tela de criação oferece opcionalmente a IA local para personalizar mais os passos. Sem Ollama, todas as funções continuam disponíveis pelo motor interno.

## Recursos

- agenda diária e dos próximos sete dias;
- atrasados em destaque e adiamento em um clique;
- planos e etapas totalmente editáveis;
- prazos distribuídos automaticamente;
- busca, filtros, tema claro/escuro e layout responsivo;
- impressão e exportação Markdown;
- API e interface separadas por HTTP;
- armazenamento local em SQLite.

Para desenvolvimento e decisões técnicas, consulte [docs/ARQUITETURA.md](docs/ARQUITETURA.md) e [CONTRATO-API.md](CONTRATO-API.md). A documentação interativa da API fica em `http://127.0.0.1:8787/api/docs` enquanto o aplicativo está aberto.

## Licença

MIT — veja [LICENSE](LICENSE).
