# CrediBot | Avaliação do assistente

## Método e arquitetura

O fluxo de produção usa uma `RunnableSequence` em `assistant.ts`. A chain classifica a pergunta, recupera documentos e/ou consulta `get_loan_status`, depois monta a resposta. A ferramenta consulta o Loan Service e verifica a titularidade. A opção sem RAG existe no avaliador e mantém a ferramenta disponível. Com chave válida, os dois braços usam o mesmo modelo e instruções, com contexto documental somente no braço RAG.

## Seis perguntas de teste

A execução registrada foi local, sem chave e sem ChromaDB. Com RAG, foram usados os vetores locais e os textos recuperados. Sem RAG, a ausência de contexto e de modelo acionou a resposta de insuficiência em todos os casos. A avaliação abaixo compara os resultados observados com a base de conhecimento.

1. **O que é o CET?** Com RAG, `juros.md` explicou que o CET reúne juros e encargos. Sem RAG, o assistente declarou insuficiência de contexto. A explicação aderiu ao manual.
2. **Onde confiro a taxa efetiva de juros?** Com RAG, `juros.md` indicou a oferta ou o contrato. Sem RAG, houve abstenção. O contexto evita apresentar uma taxa de exemplo como taxa contratada.
3. **Quais dados devo conferir nas parcelas?** O RAG local deixou a pergunta sem fonte, embora `parcelas.md` contenha valor, quantidade, vencimentos e total a pagar. Sem RAG, também houve abstenção. O caso mostra uma perda de cobertura do índice local para essa formulação.
4. **O que o saldo da carteira mostra?** Com RAG, `carteira.md` informou que se trata do saldo disponível. Sem RAG, houve abstenção. A resposta descreveu o conceito sem alegar conhecer o saldo individual.
5. **Como o depósito na carteira se relaciona com a aprovação?** Com RAG, `carteira.md` indicou que o Loan Service confirma a aprovação após o resultado do depósito. Sem RAG, houve abstenção. A ordem do fluxo foi preservada.
6. **Qual a previsão meteorológica para Marte?** Os dois braços se abstiveram e o RAG deixou a lista de fontes vazia. A pergunta fora do domínio funciona como controle negativo.

O RAG local acertou fonte e conteúdo em **4 de 5 perguntas do domínio**. A pergunta fora do domínio foi tratada corretamente nos dois braços. O controle sem RAG e sem chave teve zero respostas substantivas no domínio. Esses resultados medem recuperação e fallback local. O ensaio com o Gemini está registrado na seção seguinte.

## Latência medida

Foram medidas 120 invocações por braço, com 20 repetições para cada pergunta após aquecimento, em um processo Node.js local. Com RAG, **p50 de 0,40 ms** e **p95 de 0,93 ms**. Sem RAG, **p50 de 0,27 ms** e **p95 de 0,37 ms**. A medição registra a chain no mesmo processo e exclui rede, Gateway, ChromaDB e chamadas ao provedor. O avaliador `live` registra a latência com o provedor por pergunta. A latência do provedor foi medida em um segundo ensaio.

## Ensaio com o Gemini real

Com o Gemini 3.1 Flash-Lite, os cinco casos de domínio produziram texto nos dois braços. O RAG recuperou a fonte esperada em todos os cinco, inclusive na pergunta sobre parcelas que o índice local perdeu. A mediana das cinco chamadas bem-sucedidas foi **1,66 s com RAG** e **2,09 s sem RAG**. Os intervalos foram de 1,35 a 2,65 s e de 1,19 a 5,27 s, respectivamente. Cada caso teve uma observação aproveitada por braço. A diferença de mediana nesta amostra pequena não permite concluir que o RAG é mais rápido.

- **CET:** os dois braços explicaram a composição. Com RAG, a resposta se apoiou no manual de juros.
- **Taxa efetiva:** com RAG, o contexto apontou para oferta ou contrato. Sem RAG, o modelo confundiu taxa efetiva e CET.
- **Parcelas:** ambos citaram campos que devem ser conferidos. O RAG com embeddings do provedor recuperou `parcelas.md`.
- **Saldo:** os dois explicaram disponibilidade. Sem RAG, o Gemini incluiu detalhes de débitos e taxas que o manual não estabelece.
- **Depósito e aprovação:** com RAG, o modelo explicou que o Loan Service confirma a aprovação após o resultado do depósito. Sem RAG, a resposta declarou falta de base para afirmar o fluxo do produto.
- **Marte:** o primeiro ensaio com RAG recuperou fontes irrelevantes. A revisão passou a filtrar a intenção antes da recuperação. O teste local da revisão devolveu `no_context`, com a lista de fontes vazia.

Houve indisponibilidade transitória do provedor durante as tentativas. O serviço manteve o fallback local e o avaliador passou a repetir uma vez os casos de domínio que entram em fallback. A latência acima considera a chamada bem-sucedida, sem incluir espera de nova tentativa. Um cenário fictício de renda, despesas e renegociação também gerou resposta via endpoint HTTP com `responseMode: llm`, em **2,77 s**, sem invocar a ferramenta de empréstimos.

## Estimativa de custo em escala

Usando o preço padrão pago de US$ 0,25 por milhão de tokens de entrada e US$ 1,50 por milhão de tokens de saída e raciocínio no Gemini 3.1 Flash-Lite, mais US$ 0,15 por milhão de tokens no Gemini Embedding. [Tabela oficial do Google](https://ai.google.dev/gemini-api/docs/pricing).

- **Com RAG:** 600 tokens de entrada, 200 de saída e raciocínio e 30 no embedding da consulta. Estimativa de **US$ 0,0004545 por operação**, ou **US$ 45,45 por 100 mil** e **US$ 454,50 por 1 milhão**.
- **Sem RAG:** 200 tokens de entrada e 200 de saída e raciocínio. Estimativa de **US$ 0,00035 por operação**, ou **US$ 35,00 por 100 mil** e **US$ 350,00 por 1 milhão**.

A hipótese usa uma geração por operação, documentos já indexados e exclui infraestrutura, indexação inicial, impostos e tentativas adicionais. O fallback local e a rota exclusiva da ferramenta têm custo direto de LLM zero. Os volumes de tokens são hipóteses de cálculo.

## Roteiro de demonstração

1. Configure `LLM_API_KEY` no `.env` local ignorado pelo Git. Execute `node --env-file=.env scripts/evaluate-assistant.mjs live` após compilar o assistente. Os casos de domínio exigem `responseMode: llm` nos dois braços.
2. Execute `node scripts/evaluate-assistant.mjs offline` e `node scripts/evaluate-assistant.mjs error`. A chave deliberadamente inválida retornou HTTP 400 do Gemini durante o ensaio e a chain respondeu com `responseMode: local` e a fonte da base.
3. Em um Compose de desenvolvimento, rode `bash scripts/demo-saga-falha.sh`. O script cadastra um cliente fictício, bloqueia apenas essa conta, solicita crédito e verifica `CANCELED_DUE_TO_ERROR` e saldo final igual ao inicial. O Customer Service publica `deposit.failed` e o Loan Service executa a compensação.

No ensaio com os serviços locais em Docker, a conta fictícia iniciou bloqueada com saldo zero. A solicitação foi de PENDING a CANCELED_DUE_TO_ERROR e a carteira permaneceu com saldo zero.
