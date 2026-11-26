INSERT INTO customers (id, name, email, cpf, monthly_income, kyc_status, account_blocked) VALUES
('c-004', 'Ana Bloqueada', 'ana.bloqueada@email.com', '555.666.777-88', 6000.00, 'APPROVED', TRUE);

INSERT INTO wallets (customer_id, balance, currency) VALUES ('c-004', 0.00, 'BRL');