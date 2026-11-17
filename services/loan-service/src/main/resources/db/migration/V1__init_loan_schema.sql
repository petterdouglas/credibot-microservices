-- 1. Tabela de Escrita (Write Model)
CREATE TABLE loans (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    installments INTEGER NOT NULL,
    status VARCHAR(30) NOT NULL,
    reason TEXT,
    reviewed_by VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    canceled_at TIMESTAMPTZ
);

-- 2. Tabela de Leitura (Read Model)
CREATE TABLE loan_read_views (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    installments INTEGER NOT NULL,
    status VARCHAR(30) NOT NULL,
    reason TEXT,
    reviewed_by VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    canceled_at TIMESTAMPTZ
);

CREATE INDEX idx_loan_read_customer_status ON loan_read_views (customer_id, status);

-- 3. Outbox Pattern
-- 3.1 Tabela de Eventos
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_status_created ON outbox_events (status, created_at);