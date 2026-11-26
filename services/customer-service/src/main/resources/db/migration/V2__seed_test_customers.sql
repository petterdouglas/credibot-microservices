-- Clientes de teste usados pelos frontends (login por ID) e pela demonstração da SAGA.
-- c-004 tem a conta bloqueada para exercitar a compensação (deposit.failed).
INSERT INTO customers (id, name, cpf, email, monthly_income, kyc_status, account_blocked, balance) VALUES
('c-001', 'João Silva',     '12345678900', 'joao.silva@email.com',     5500.00, 'APPROVED', FALSE, 12500.00),
('c-002', 'Maria Santos',   '98765432100', 'maria.santos@email.com',   8200.00, 'APPROVED', FALSE, 34800.50),
('c-003', 'Pedro Oliveira', '11122233344', 'pedro.oliveira@email.com', 3200.00, 'PENDING',  FALSE,  1500.00),
('c-004', 'Ana Bloqueada',  '55566677788', 'ana.bloqueada@email.com',  6000.00, 'APPROVED', TRUE,      0.00);
