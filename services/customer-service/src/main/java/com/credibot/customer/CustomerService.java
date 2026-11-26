package com.credibot.customer;

import java.math.BigDecimal;
import java.util.UUID;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CustomerService {
    public record Profile(String id, String name, String cpf, String email,
                          BigDecimal monthlyIncome, String kycStatus, boolean accountBlocked) {}

    public record Wallet(String customerId, BigDecimal balance, String currency) {}

    public record Deposit(String customerId, BigDecimal amount, String transactionId,
                          BigDecimal newBalance, String failureReason) {}

    private final JdbcClient db;

    public CustomerService(JdbcClient db) {
        this.db = db;
    }

    public String register(String name, String cpf, String email, BigDecimal monthlyIncome) {
        String id = "C-" + UUID.randomUUID();
        try {
            db.sql("INSERT INTO customers (id, name, cpf, email, monthly_income) VALUES (?, ?, ?, ?, ?)")
                    .params(id, name, cpf, email, monthlyIncome).update();
        } catch (DuplicateKeyException error) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CPF ou e-mail já cadastrado.");
        }
        return id;
    }

    public Profile profile(String id) {
        return db.sql("""
                SELECT id, name, cpf, email, monthly_income, kyc_status, account_blocked
                FROM customers WHERE id = ?
                """).param(id).query(Profile.class).optional().orElseThrow(CustomerService::notFound);
    }

    public Wallet wallet(String id) {
        return db.sql("SELECT balance FROM customers WHERE id = ?")
                .param(id).query(BigDecimal.class).optional()
                .map(balance -> new Wallet(id, balance, "BRL")).orElseThrow(CustomerService::notFound);
    }

    @Transactional
    public Deposit deposit(String customerId, String loanId, BigDecimal amount) {
        db.sql("""
                INSERT INTO deposits (loan_id, customer_id, amount) VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE loan_id = loan_id
                """).params(loanId, customerId, amount).update();

        Deposit existing = db.sql("""
                SELECT customer_id, amount, transaction_id, new_balance, failure_reason
                FROM deposits WHERE loan_id = ? FOR UPDATE
                """).param(loanId).query(Deposit.class).single();
        if (!existing.customerId().equals(customerId) || existing.amount().compareTo(amount) != 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Empréstimo já associado a outro depósito.");
        }
        if (existing.transactionId() != null || existing.failureReason() != null) {
            return existing;
        }

        record Account(BigDecimal balance, boolean accountBlocked) {}
        var account = db.sql("SELECT balance, account_blocked FROM customers WHERE id = ? FOR UPDATE")
                .param(customerId).query(Account.class).optional();
        if (account.isEmpty() || account.get().accountBlocked()) {
            String reason = account.isEmpty() ? "Cliente não encontrado." : "Conta bloqueada.";
            db.sql("UPDATE deposits SET failure_reason = ? WHERE loan_id = ?")
                    .params(reason, loanId).update();
            return new Deposit(customerId, amount, null, null, reason);
        }

        String transactionId = "TX-" + UUID.randomUUID();
        BigDecimal newBalance = account.get().balance().add(amount);
        db.sql("UPDATE customers SET balance = ? WHERE id = ?").params(newBalance, customerId).update();
        db.sql("UPDATE deposits SET transaction_id = ?, new_balance = ? WHERE loan_id = ?")
                .params(transactionId, newBalance, loanId).update();
        return new Deposit(customerId, amount, transactionId, newBalance, null);
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente não encontrado.");
    }
}
