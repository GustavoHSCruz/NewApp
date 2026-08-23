# Monetização — Clareia Apoiador

O Clareia gratuito continua completo. A licença Apoiador é um pagamento único sugerido de **R$ 39** e acrescenta calendário `.ics`, modelos próprios, HTML com capa e temas extras. Ollama permanece gratuito. Não há assinatura, telemetria, conta ou DRM oculto.

## Abrir as vendas

1. Crie um Link de Pagamento avulso de R$ 39 no Mercado Pago. Confira a tarifa vigente diretamente no painel antes de publicar; tarifas mudam e não são fixadas neste projeto.
2. Inicie o Clareia com `CLAREIA_CHECKOUT_URL="https://seu-link" ./iniciar.sh`. Stripe Payment Links também funciona como alternativa: a aplicação aceita qualquer URL HTTPS.
3. Após a confirmação do pagamento, emita a chave no computador que contém o segredo:

```bash
python ferramentas/licencas.py emitir --nome "Nome da pessoa" --email "email@exemplo.com"
```

4. Envie a chave `CLA1...` ao comprador. A ativação acontece na tela Apoiador e funciona offline.

O checkout fica hospedado no provedor; nenhuma credencial ou dado de cartão passa pelo Clareia. Sem `CLAREIA_CHECKOUT_URL`, a tela explica que as vendas ainda não estão abertas.

## Chaves e segurança

O par RSA inicial foi criado na preparação deste repositório. A chave pública está em `api/chave_publica.json`. A privada fica em `.clareia-vendedor/chave_privada.json`, ignorada pelo git. Faça um backup seguro dela: sem esse arquivo não é possível emitir novas licenças compatíveis.

Para trocar o par, execute `python ferramentas/licencas.py gerar-chaves` antes de distribuir uma versão. Isso invalida chaves emitidas pelo par anterior. O projeto é MIT; a licença é uma forma prática de reconhecer apoiadores, não uma tentativa de impedir modificações no código.

## Economia unitária

Preço bruto: R$ 39. Receita líquida depende da tarifa e prazo escolhidos no provedor. Não há custo de nuvem do produto. Custos fiscais, reembolsos e eventuais contestações devem ser tratados pelo vendedor conforme seu enquadramento e as regras atuais do provedor.
