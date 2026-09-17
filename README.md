# CrediBot — Proposta de Sistema Distribuído de Microcrédito Assistido por Inteligência Artificial

**Disciplina:** Sistemas Distribuídos (GCC129)  
**Instituição:** Universidade Federal de Lavras (UFLA)  
**Tema:** Startup de Microcrédito com Assistente de IA  
**Status:** Proposta em fase de projeto — não implementado  

**Colaboradores:**  
- Petter Douglas  
- Carlos Eduardo Ribeiro  
- Lucca Guedes  
- Felipe Crisóstimo  

---

## Contexto e Motivação

O acesso ao crédito formal no Brasil ainda é um desafio estrutural para parcelas significativas da população. Segundo o Relatório de Cidadania Financeira do Banco Central do Brasil (2023), embora a universalização do acesso bancário tenha avançado — impulsionada pelo Pix e pelo Open Finance —, a qualidade da inclusão financeira permanece desigual. Populações de baixa renda frequentemente enfrentam dificuldades não apenas para obter crédito, mas para compreender os termos e as implicações dos produtos financeiros disponíveis.

Nesse cenário, o microcrédito surge como instrumento de política de inclusão, porém sua eficácia depende da clareza das informações transmitidas ao tomador. A complexidade de taxas de juros, prazos e condições de aprovação é um obstáculo real para esse público.

O **CrediBot** propõe uma plataforma de microcrédito que combina simplicidade operacional com um assistente de inteligência artificial capaz de orientar o usuário sobre educação financeira, acompanhar o status de suas solicitações e responder dúvidas em linguagem acessível. A arquitetura é concebida como um sistema distribuído de microsserviços, atendendo aos requisitos da disciplina GCC129.

---

## Arquitetura do Sistema

### Visão Geral

O sistema é dividido em três camadas principais: a camada de entrada (clientes e gateways), a camada de domínio (microsserviços) e a camada de infraestrutura (mensageria, bancos de dados e orquestração de containers).

```
[Web Client]          [Painel Admin]
      |                     |
  [Web BFF]            [Admin BFF]
      \                   /
       [API Gateway / Rate Limiting]
              |
   +----------+----------+----------+
   |          |          |          |
[Customer] [Loan]  [Credit     [AI
[Service]  [Service] Analysis]  Assistant]
   |          |      Service]   Service]
[MySQL]  [PostgreSQL] [MongoDB] [Qdrant /
                                ChromaDB]
```

---

### 1. Clientes e BFFs (Backend for Frontend)

**Web Client (Cliente Final)**  
Interface voltada ao usuário final. Permite solicitar microcrédito, acompanhar o status da proposta e interagir com o assistente de IA. Por razões de segurança, dados sensíveis de análise de risco não trafegam por essa camada.

**Painel Admin (Backoffice)**  
Interface para funcionários responsáveis pela revisão manual de propostas que não foram aprovadas ou rejeitadas automaticamente pelo motor de análise. Exibe métricas detalhadas de operação.

**API Gateway**  
Ponto único de entrada. Responsável pelo roteamento das requisições para os BFFs corretos e pela aplicação de Rate Limiting, protegendo os serviços internos de sobrecarga.

---

### 2. Microsserviços de Domínio

| Microsserviço | Responsabilidade | Banco de Dados |
|---|---|---|
| Customer Service | Gerencia dados cadastrais do cliente e saldo da carteira virtual | MySQL |
| Loan Service | Inicia e orquestra a proposta de empréstimo; implementa CQRS | PostgreSQL |
| Credit Analysis Service | Motor de regras de aprovação e rejeição de crédito | MongoDB |
| AI Assistant Service | Gerencia o fluxo do modelo de linguagem (LLM) e a base vetorial | Qdrant / ChromaDB |

A adoção de bancos de dados exclusivos por serviço — conhecida como *polyglot persistence* — é uma prática consolidada em arquiteturas de microsserviços. Cada banco é escolhido com base nas características do dado manipulado: relacional para dados cadastrais estruturados, documental para regras de crédito flexíveis e vetorial para recuperação semântica de documentos pelo assistente de IA.

---

### 3. Coreografia SAGA e Outbox Pattern

A transação distribuída central do sistema envolve três microsserviços e é gerenciada pelo padrão SAGA na modalidade de coreografia, complementado pelo Outbox Pattern para garantia de entrega de eventos.

O SAGA é um padrão para gerenciamento de transações de longa duração em sistemas distribuídos. Em vez de usar um coordenador centralizado com bloqueio de recursos (como o Two-Phase Commit), o SAGA decompõe a transação em uma sequência de transações locais, cada uma publicando um evento que aciona a próxima etapa. Em caso de falha, transações compensatórias desfazem as etapas anteriores (GARCIA-MOLINA; SALEM, 1987).

**Fluxo de aprovação:**

1. O **Loan Service** cria a proposta com status `PENDING`. Usando o Outbox Pattern, registra o evento `PropostaCriada` na própria base de dados antes de publicá-lo na fila de mensagens (ex: RabbitMQ), garantindo atomicidade local.
2. O **Credit Analysis Service** consome o evento, executa as regras de análise e publica `CreditoAprovado`.
3. O **Customer Service** consome a aprovação e deposita o valor na carteira virtual do cliente.

**Fluxo de compensação (cenário de falha):**

Caso o Customer Service detecte que não pode concluir o depósito (ex: conta bloqueada por suspeita de fraude), ele publica o evento `FalhaDeposito`. O Loan Service escuta esse evento e executa a transação compensatória, alterando o status do empréstimo para `CANCELED_DUE_TO_ERROR`.

Esse modelo preserva a consistência eventual do sistema sem exigir bloqueio distribuído de recursos, o que seria inviável em escala.

---

### 4. CQRS no Loan Service

O Loan Service implementa o padrão CQRS (Command Query Responsibility Segregation), separando o modelo de gravação — responsável por processar comandos de negócio com lógica de consistência — do modelo de leitura — otimizado para consultas rápidas de listagem de propostas.

Essa separação permite escalar os dois modelos de forma independente conforme a demanda. Em sistemas financeiros, onde o volume de leituras tende a superar o de gravações, essa abordagem é especialmente relevante (PANDIYA; CHARANKAR, 2024).

---

### 5. Assistente de IA com RAG e LangChain

O AI Assistant Service utiliza a técnica de Retrieval-Augmented Generation (RAG) para fundamentar as respostas do modelo de linguagem em documentos próprios da plataforma, reduzindo o risco de alucinações e aumentando a rastreabilidade das informações fornecidas ao usuário.

**Base de conhecimento (RAG):**  
A base do sistema conterá documentos internos (políticas de taxas, regulamentos, FAQs) indexados em um banco de dados vetorial (Qdrant ou ChromaDB). Quando o usuário realiza uma pergunta como "Quais são as taxas para empréstimos de R$ 500?", o sistema recupera os trechos relevantes dos documentos e os usa como contexto para a geração da resposta.

Estudos recentes apontam que o RAG é preferível ao fine-tuning em instituições financeiras pela capacidade de incorporar dados atualizados sem retreinamento, pela transparência das respostas rastreadas a fontes específicas e pelo menor custo operacional (CHEN et al., 2024).

**Ferramentas integradas via LangChain:**  
Quando o usuário pergunta sobre o status de um empréstimo específico ("Como está meu empréstimo?"), o LangChain invoca uma Tool que realiza uma requisição REST ao Loan Service, retornando o status real da proposta ao usuário em tempo real. Isso combina a capacidade generativa do LLM com dados estruturados e atualizados do sistema.

**Resiliência:**  
Como provedores de LLM (OpenAI, Gemini) podem ficar indisponíveis, o serviço implementa Circuit Breaker com Fallback: em caso de falha, o sistema retorna uma mensagem amigável ao usuário sem propagar o erro para outras partes do sistema.

---

### 6. Infraestrutura

**Docker:**  
Cada microsserviço possui um `Dockerfile` multi-stage, minimizando o tamanho da imagem final. Um arquivo `docker-compose.yml` orquestra o ambiente de desenvolvimento completo, incluindo os bancos de dados e a infraestrutura de mensageria.

**Kubernetes:**  
O ambiente de produção será orquestrado via Kubernetes, rodando localmente com Minikube ou k3d. Os recursos previstos são:

- `Deployment` para cada microsserviço
- `Service` para exposição interna
- `ConfigMap` para variáveis de configuração não sensíveis
- `Secret` para chaves de API (OpenAI, etc.)
- `Ingress` para roteamento externo

---

## Tecnologias Previstas

| Categoria | Tecnologias |
|---|---|
| Linguagem | Node.js / Python (a definir por serviço) |
| Mensageria | RabbitMQ ou AWS SQS |
| Bancos de Dados | MySQL, PostgreSQL, MongoDB, Qdrant / ChromaDB |
| IA | LangChain, OpenAI API / Gemini API |
| Containers | Docker, Docker Compose |
| Orquestração | Kubernetes (Minikube / k3d) |
| Gateway | Kong / Nginx |

---

## Estado do Projeto

Este repositório representa a **proposta e o planejamento arquitetural** do sistema. Nenhum microsserviço foi implementado até o momento. O desenvolvimento seguirá a ordem:

- [ ] Definição dos contratos de API (OpenAPI / Protobuf)
- [ ] Implementação do Customer Service
- [ ] Implementação do Loan Service com CQRS
- [ ] Implementação do Credit Analysis Service
- [ ] Configuração da mensageria e SAGA
- [ ] Implementação do AI Assistant Service com RAG
- [ ] Configuração do ambiente Kubernetes
- [ ] Testes de integração e de falha/compensação

---

## Referências

BANCO CENTRAL DO BRASIL. **Relatório de Cidadania Financeira 2023**. Brasília: BCB, 2023. Disponível em: https://www.bcb.gov.br/cidadaniafinanceira. Acesso em: set. 2026.

CHEN, Yupeng et al. **Retrieval-Augmented Generation for Financial Question Answering: Challenges and Approaches**. arXiv preprint, 2024. Disponível em: https://arxiv.org/abs/2401.06080. Acesso em: set. 2026.

GARCIA-MOLINA, Hector; SALEM, Kenneth. **Sagas**. ACM SIGMOD Record, v. 16, n. 3, p. 249-259, 1987. Disponível em: https://dl.acm.org/doi/10.1145/38714.38742. Acesso em: set. 2026.

PANDIYA, R.; CHARANKAR, N. **Optimizing Performance and Scalability in Micro Services with CQRS Design**. ResearchGate, maio 2024. Disponível em: https://www.researchgate.net/publication/381069724. Acesso em: set. 2026.

RICHARDSON, Chris. **Microservices Patterns: With Examples in Java**. Manning Publications, 2018. Referência padrão para os padrões SAGA, Outbox e CQRS em arquiteturas de microsserviços.
