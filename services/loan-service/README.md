# Loan Service — Guia de Arquitetura e Desenvolvimento

Microsserviço responsável pela **máquina de estados do ciclo de vida do empréstimo**, implementação do **Transactional Outbox Pattern**, participação na **SAGA Coreografada** e separação de leitura e escrita via **CQRS**.

- **Stack:** Java 21, Spring Boot 3.4, Spring Data JPA, Flyway, PostgreSQL, RabbitMQ, Spring HATEOAS, Bean Validation.
- **Porta Padrão:** `8081`
- **Prefixo REST:** `/api/v1/loans`

---

## 1. Papel do `loan-service` no Ecossistema CrediBot

1. **Write Model + Outbox Pattern (Início da SAGA):**
   - Recebe a solicitação de empréstimo (`POST /api/v1/loans`), grava no PostgreSQL com status `PENDING` e, **na mesma transação ACID**, insere o evento `LoanCreatedEvent` na tabela `outbox_events`.
   - Um worker assíncrono (`OutboxRelayScheduler`) lê a tabela `outbox_events` e publica o evento no RabbitMQ, evitando problemas de *Dual Write*.
2. **Reação aos Eventos da SAGA Coreografada:**
   - Consome `CreditRejectedEvent` (*Credit Analysis Service*) ➔ altera o status para `REJECTED`.
   - Consome `DepositSuccessEvent` (*Customer Service*) ➔ altera o status para `APPROVED`.
   - Consome `DepositFailedEvent` (transação compensatória do *Customer Service*) ➔ executa a compensação e altera o status para `CANCELED_DUE_TO_ERROR`.
3. **CQRS (Command Query Responsibility Segregation):**
   - **Write Model (`loans`):** Focado em integridade transacional e validação das transições de estado.
   - **Read Model (`loan_read_views`):** Tabela desnormalizada sincronizada de forma assíncrona (tolerância de lag de 1–3s) para consultas paginadas rápidas (`GET /api/v1/loans`) e consulta de status em tempo real pela Tool do *AI Assistant Service* (`GET /api/v1/loans/{id}`).
4. **Exposição REST com HATEOAS e RFC 7807 (Problem Details):**
   - Atende ao **Web BFF**, **Admin BFF** (incluindo decisão manual da mesa de crédito) e ao **AI Assistant Service**.

---

## 2. Mapa de Pacotes, Classes e Métodos

### 2.1 Camada de Domínio (`com.credibot.loan.domain`)

#### `domain.model`
- **`LoanStatus` (Enum)**
  - Valores: `PENDING`, `APPROVED`, `REJECTED`, `CANCELED`, `CANCELED_DUE_TO_ERROR`.
  - Métodos:
    - `boolean canTransitionTo(LoanStatus nextStatus)` — Valida transições permitidas da máquina de estados.
- **`Loan` (Aggregate Root / Entidade de Domínio Pura)**
  - Atributos: `id` (ex.: `L-9988`), `customerId`, `amount`, `installments`, `interestRate`, `status`, `cancellationReason`, `reviewedBy`, `createdAt`, `updatedAt`, `canceledAt`.
  - Métodos de negócio:
    - `static Loan createProposal(String customerId, BigDecimal amount, Integer installments)`
    - `void approve()`
    - `void approveManually(String officerId, String justification)`
    - `void reject(String reason)`
    - `void cancel(String reason)`
    - `void compensateFailure(String reason)`

#### `domain.event`
- **`LoanDomainEvent` (`sealed interface`)**
  - `LoanCreatedEvent(String loanId, String customerId, BigDecimal amount, Integer installments, Instant occurredAt)`
  - `LoanStatusChangedEvent(String loanId, String customerId, BigDecimal amount, LoanStatus oldStatus, LoanStatus newStatus, String reason, Instant updatedAt)`

#### `domain.repository`
- **`LoanCommandRepository` (Interface - Write Model)**
  - `Loan save(Loan loan)`
  - `Optional<Loan> findById(String id)`
- **`LoanQueryRepository` (Interface - Read Model CQRS)**
  - `Optional<LoanReadProjection> findById(String id)`
  - `Page<LoanReadProjection> findByFilters(String customerId, LoanStatus status, Pageable pageable)`

---

### 2.2 Camada de Aplicação (`com.credibot.loan.application`)

#### `application.usecase`
- **`CreateLoanUseCase`**
  - `CreateLoanResponse execute(CreateLoanRequest request)` — Cria proposta `PENDING`, persiste no Write Model, sincroniza o Read Model e grava `LoanCreatedEvent` no Outbox na mesma transação `@Transactional`.
- **`CancelLoanUseCase`**
  - `CancelLoanResponse execute(String loanId, String reason)` — Cancela o empréstimo e atualiza o Read Model.
- **`ReviewLoanUseCase`**
  - `ReviewLoanResponse execute(String loanId, ManualReviewRequest request)` — Aplica parecer manual da mesa de crédito (`PATCH /api/v1/loans/{id}/review`).
- **`GetLoanStatusUseCase`**
  - `LoanStatusResponse findById(String loanId)` — Consulta rápida no Read Model (usado pelo LangChain Tool `get_loan_status`).
- **`ListLoansUseCase`**
  - `PagedLoanResponse findAll(String customerId, LoanStatus status, int page, int size)` — Listagem paginada no Read Model.

#### `application.service`
- **`SagaCompensationService` (ou `LoanLifecycleService`)**
  - `void handleCreditRejected(String loanId, String reason)`
  - `void handleDepositSuccess(String loanId, String transactionId)`
  - `void handleDepositFailed(String loanId, String failureReason)`
- **`LoanProjectionSyncService`**
  - `void syncReadModel(LoanStatusChangedEvent event)`

---

### 2.3 Camada de Infraestrutura (`com.credibot.loan.infrastructure`)

#### `infrastructure.persistence.write`
- **`LoanWriteEntity` (`@Entity`, tabela `loans`)**
- **`SpringDataLoanWriteRepository` (`JpaRepository<LoanWriteEntity, String>`)**
- **`LoanCommandRepositoryImpl` (`@Repository`)**

#### `infrastructure.persistence.read`
- **`LoanReadEntity` (`@Entity`, tabela `loan_read_views`)**
- **`SpringDataLoanReadRepository` (`JpaRepository<LoanReadEntity, String>`)**
- **`LoanQueryRepositoryImpl` (`@Repository`)**

#### `infrastructure.outbox`
- **`OutboxEventEntity` (`@Entity`, tabela `outbox_events`)**
  - Campos: `id (UUID)`, `aggregateType`, `aggregateId`, `eventType`, `payload (JSONB)`, `status (PENDING, PUBLISHED, FAILED)`, `createdAt`, `publishedAt`.
- **`OutboxRepository` (`JpaRepository<OutboxEventEntity, UUID>`)**
- **`OutboxService`**
  - `void enqueue(String aggregateId, String eventType, Object payload)`
- **`OutboxRelayScheduler` (`@Component` com `@Scheduled`)**
  - `void pollAndPublish()` — Busca eventos `PENDING`, publica no RabbitMQ e marca como `PUBLISHED`.

#### `infrastructure.messaging`
- **`publisher.LoanEventPublisher`**
  - `void publishOutboxEvent(OutboxEventEntity event)`
- **`consumer.SagaEventConsumer` (`@Component` com `@RabbitListener`)**
  - `void onCreditRejected(CreditRejectedMessage message)`
  - `void onDepositSuccess(DepositSuccessMessage message)`
  - `void onDepositFailed(DepositFailedMessage message)`

#### `infrastructure.config`
- **`RabbitMqConfig`** — Exchanges, Queues, Routing Keys, DLQ e `Jackson2JsonMessageConverter`.
- **`SchedulingConfig`** — `@EnableScheduling` para o poller do Outbox.

---

### 2.4 Camada de API (`com.credibot.loan.api`)

#### `api.controller`
- **`LoanController` (`@RestController`, `@RequestMapping("/api/v1/loans")`)**
  - `POST /api/v1/loans` ➔ `createLoan(...)` (`201 Created` + HATEOAS)
  - `GET /api/v1/loans/{id}` ➔ `getLoanById(...)` (`200 OK` + HATEOAS)
  - `GET /api/v1/loans` ➔ `listLoans(...)` (`200 OK` paginado via CQRS Read Model)
  - `PATCH /api/v1/loans/{id}/cancel` ➔ `cancelLoan(...)` (`200 OK`)
  - `PATCH /api/v1/loans/{id}/review` ➔ `reviewLoan(...)` (`200 OK`)
- **`LoanModelAssembler`** — Monta o objeto `_links` (`self`, `cancel`, `customer`, `wallet`).

#### `api.dto` (Java 21 `record` + Bean Validation)
- **Requests:** `CreateLoanRequest`, `CancelLoanRequest`, `ManualReviewRequest`.
- **Responses:** `CreateLoanResponse`, `LoanStatusResponse`, `LoanSummaryItem`, `PagedLoanResponse`, `CancelLoanResponse`, `ReviewLoanResponse`.

#### `api.exception`
- **`LoanNotFoundException` (`404 Not Found`)**
- **`InvalidLoanStateTransitionException` (`422 Unprocessable Entity`)**
- **`GlobalExceptionHandler` (`@RestControllerAdvice`)** — Retorna `ProblemDetail` aderente à **RFC 7807** (`type`, `title`, `status`, `detail`, `instance`, `timestamp`).

---

## 3. Passo a Passo Recomendado de Desenvolvimento (Inside-Out)

### [ ] Passo 1: Núcleo de Domínio e Máquina de Estados (Zero Framework)
1. Implementar `LoanStatus` com a regra de transição `canTransitionTo(...)`.
2. Implementar a entidade de domínio `Loan` com `createProposal(...)`, `approve()`, `approveManually(...)`, `reject(...)`, `cancel(...)` e `compensateFailure(...)`.
3. Criar as exceções de domínio e os records de eventos (`LoanCreatedEvent`, `LoanStatusChangedEvent`).
4. Definir as interfaces `LoanCommandRepository` e `LoanQueryRepository`.
- **Validação:** Testes unitários JUnit puros validando transições válidas e inválidas da máquina de estados.

### [ ] Passo 2: Schema do Banco (Flyway) e Persistência (Write & Outbox)
1. Criar a migration `src/main/resources/db/migration/V1__init_loan_schema.sql` com as tabelas:
   - `loans` (Write Model)
   - `loan_read_views` (Read Model CQRS com índices em `customer_id`, `status`, `created_at`)
   - `outbox_events` (Outbox Pattern com coluna `payload JSONB`)
2. Criar `LoanWriteEntity`, mapper e `SpringDataLoanWriteRepository` em `infrastructure/persistence/write`.
3. Criar `OutboxEventEntity`, `OutboxRepository` e `OutboxService` em `infrastructure/outbox`.
- **Validação:** Subir o PostgreSQL local, rodar a aplicação (`LoanServiceApplication`) e verificar se o Flyway cria as 3 tabelas e o Hibernate (`ddl-auto=validate`) valida o schema sem erros.

### [ ] Passo 3: Casos de Uso de Escrita (Write Model + Sincronização CQRS)
1. Implementar `CreateLoanUseCase` anotado com `@Transactional`:
   - Salvar a proposta no Write Model (`loans`).
   - Atualizar/inserir a visão de leitura no Read Model (`loan_read_views`).
   - Enfileirar `LoanCreatedEvent` na tabela `outbox_events` na mesma transação.
2. Implementar `CancelLoanUseCase` e `ReviewLoanUseCase`.
- **Validação:** Testar a criação de proposta verificando que tanto `loans` quanto `outbox_events` e `loan_read_views` recebem os registros atomicamente.

### [ ] Passo 4: Casos de Uso de Leitura (Read Model CQRS)
1. Criar `LoanReadEntity` e `SpringDataLoanReadRepository` em `infrastructure/persistence/read`.
2. Implementar `GetLoanStatusUseCase` (busca por `id` na tabela de leitura).
3. Implementar `ListLoansUseCase` (busca paginada por `customerId` e `status`).

### [ ] Passo 5: API REST, HATEOAS e Erros RFC 7807
1. Criar os `record` DTOs em `api/dto` com validações Jakarta (`@NotBlank`, `@Positive`, `@Min`, `@Max`).
2. Implementar `GlobalExceptionHandler` em `api/exception` retornando `ProblemDetail` (RFC 7807).
3. Implementar `LoanController` e `LoanModelAssembler` para as rotas:
   - `POST /api/v1/loans`
   - `GET /api/v1/loans/{id}`
   - `GET /api/v1/loans`
   - `PATCH /api/v1/loans/{id}/cancel`
   - `PATCH /api/v1/loans/{id}/review`
- **Validação:** Testar todas as rotas via cURL/Postman/Insomnia conferindo os payloads, status codes, `_links` (HATEOAS) e erros RFC 7807 conforme `docs/contratos_rotas.pdf`.

### [ ] Passo 6: Worker do Outbox e Mensageria da SAGA (RabbitMQ)
1. Configurar Exchanges, Queues e `Jackson2JsonMessageConverter` em `RabbitMqConfig`.
2. Implementar `LoanEventPublisher` e `OutboxRelayScheduler` (`@Scheduled`) para publicar eventos `PENDING` da tabela `outbox_events` no RabbitMQ e marcá-los como `PUBLISHED`.
3. Implementar `SagaEventConsumer` (`@RabbitListener`) e `SagaCompensationService` para processar:
   - `CreditRejectedEvent` ➔ status `REJECTED`
   - `DepositSuccessEvent` ➔ status `APPROVED`
   - `DepositFailedEvent` ➔ status `CANCELED_DUE_TO_ERROR` (compensação da SAGA)
- **Validação:** Criar um empréstimo via `POST /api/v1/loans`, conferir a mensagem publicada no RabbitMQ Management (`localhost:15672`) e publicar manualmente eventos de aprovação/falha no painel do RabbitMQ para validar a transição de estado do empréstimo.

### [ ] Passo 7: Testes Automatizados e Containerização
1. Criar testes unitários para os casos de uso e máquina de estados.
2. Criar testes de integração validando o fluxo REST ➔ PostgreSQL/Outbox ➔ RabbitMQ.
3. Criar o `Dockerfile` multi-stage (Maven build + JRE 21) em `services/loan-service/Dockerfile` para execução via `docker compose`.

