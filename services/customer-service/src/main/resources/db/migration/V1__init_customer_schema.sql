-- Flyway V1: Schema inicial do Customer Service (MySQL)

CREATE TABLE customers (
    id VARCHAR(50) NOT NULL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL,
    cpf VARCHAR(14),
    monthly_income DECIMAL(15,2),
    kyc_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    account_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE wallets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_wallet_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT uk_wallet_customer UNIQUE (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dados iniciais para teste
INSERT INTO customers (id, name, email, cpf, monthly_income, kyc_status, account_blocked) VALUES
('c-001', 'João Silva', 'joao.silva@email.com', '123.456.789-00', 5500.00, 'APPROVED', FALSE),
('c-002', 'Maria Santos', 'maria.santos@email.com', '987.654.321-00', 8200.00, 'APPROVED', FALSE),
('c-003', 'Pedro Oliveira', 'pedro.oliveira@email.com', '111.222.333-44', 3200.00, 'PENDING', FALSE);

INSERT INTO wallets (customer_id, balance, currency) VALUES
('c-001', 12500.00, 'BRL'),
('c-002', 34800.50, 'BRL'),
('c-003', 1500.00, 'BRL');
