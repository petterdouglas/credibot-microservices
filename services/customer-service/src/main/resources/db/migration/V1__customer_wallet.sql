CREATE TABLE customers (
    id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    cpf CHAR(11) NOT NULL UNIQUE,
    email VARCHAR(254) NOT NULL UNIQUE,
    monthly_income DECIMAL(15, 2) NOT NULL,
    kyc_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    account_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0
);

CREATE TABLE deposits (
    loan_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    customer_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    transaction_id VARCHAR(40),
    new_balance DECIMAL(15, 2),
    failure_reason VARCHAR(200)
);
