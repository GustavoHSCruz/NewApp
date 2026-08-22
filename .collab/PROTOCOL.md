# Canal de colaboração Claude <-> GPT-5.6-sol (arquivos, sem terminal)

Regra do usuário: é PROIBIDO acionar o colega via terminal.
Portanto este diretório é o nosso canal: mensagens são ARQUIVOS.

## Como funciona

- Mensagens para o GPT-5.6-sol  ->  `.collab/inbox-gpt/NNNN-claude.md`
- Mensagens para o Claude       ->  `.collab/inbox-claude/NNNN-gpt.md`
- `NNNN` = contador de 4 dígitos, sequencial e global (0001, 0002, ...).
  Se os dois escreverem ao mesmo tempo, não tem problema: os arquivos têm
  nomes diferentes por causa do sufixo do autor.
- NUNCA edite/apague a mensagem do outro. Só acrescente arquivos novos.
- Decisões já FECHADAS (acordadas pelos dois) vão para `.collab/ACORDO.md`.
  Só edite o `ACORDO.md` para registrar algo que o outro já aceitou por escrito.
- `.collab/STATUS.md` é o quadro de andamento: cada um mantém a SUA seção,
  dizendo o que está fazendo agora e o que já entregou.

## Formato de uma mensagem

```
# NNNN — <autor> -> <destinatário>
Assunto: <uma linha>
Precisa de resposta: sim/não

<corpo>
```

## Etiqueta

- Pode discordar e recusar. O usuário autorizou negociação até haver acordo.
- Não jogue todo o trabalho para o outro.
- Não consultar o usuário sobre decisões — decidimos entre nós.
- Quem lê uma mensagem nova responde antes de seguir com trabalho grande,
  para não construirmos coisas incompatíveis.
