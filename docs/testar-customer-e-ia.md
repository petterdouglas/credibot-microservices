# Testar o Customer Service e o assistente CrediBot

## Conversar com o assistente no PowerShell

Na raiz do repositório, use o Node.js 20 ou superior. O assistente local fica em `127.0.0.1:3003`.

```powershell
cd services/ai-assistant-service
npm.cmd ci
npm.cmd run build
npm.cmd start
```

Em outro PowerShell, envie uma pergunta. Use o mesmo comando com outras mensagens para conversar.

```powershell
$chat = 'http://127.0.0.1:3003/api/v1/chat'
$body = @{ customerId = 'C-1122'; message = 'O que é o CET e como funcionam os juros?' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri $chat -ContentType 'application/json; charset=utf-8' -Body $body
```

A resposta deve citar `juros.md` em `contextSources`. Experimente também **Como funcionam as parcelas?** e **Qual o status do meu empréstimo?**. A última pergunta aciona `get_loan_status` e requer o Loan Service. Quando executar fora do Compose, a URL padrão desse serviço é `http://127.0.0.1:8081`.

### Usar geração de texto por um modelo

Antes de executar `npm.cmd start`, configure o provedor no mesmo PowerShell. O comando abaixo lê a chave sem exibi-la no terminal.

```powershell
$env:LLM_PROVIDER = 'gemini'
$env:LLM_API_KEY = Read-Host 'Chave Gemini' -MaskInput
npm.cmd start
```

Para usar OpenAI, defina `LLM_PROVIDER=openai` no ambiente e use a chave correspondente. `LLM_MODEL` permite selecionar um modelo disponível na sua conta. No Compose, configure as mesmas variáveis no arquivo local `.env` e recrie o assistente com `docker compose up -d --build ai-assistant-service`.

Na API direta, `responseMode: llm` confirma que o provedor gerou o texto. `local` indica resposta com trechos dos manuais e `tool` indica retorno da consulta ao Loan Service. As respostas sobre o estado de um empréstimo usam os dados do serviço transacional.

## Testar a integração via Docker Compose

Configure `.env` a partir de `.env.example`, se ainda não houver um arquivo local. Execute a partir da raiz do repositório.

```sh
docker compose up -d --build --wait customer-service credit-analysis-service loan-service ai-assistant-service web-bff
docker compose exec -T web-bff node --input-type=module < scripts/test-customer-ai.mjs
```

Se o Docker estiver instalado no WSL, execute os comandos em um terminal Ubuntu, na pasta do repositório. O teste cria clientes fictícios e solicita microcrédito. Use uma base de desenvolvimento. O teste verifica cadastro, perfil, carteira, aprovação com depósito, compensação para cliente inexistente, repetição de depósito, validação do chat, consulta ao Loan Service, proteção entre titulares e a rota autenticada do Web BFF.

As operações internas são `POST /api/v1/customers`, `GET /api/v1/customers/{id}`, `GET /api/v1/customers/{id}/wallet` e `POST /api/v1/customers/{id}/deposit`. O cadastro inicia o KYC em `PENDING`. A verificação de identidade depende de um processo externo. Contas bloqueadas recebem recusa de depósito. O assistente está na porta interna `3003` do Compose, e o Gateway expõe `POST /web/chat` para clientes autenticados.
