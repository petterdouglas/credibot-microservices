package com.credibot.loan.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import lombok.Getter;

@Getter
public class Loan {
    private String id;
    private String customerId;
    private BigDecimal amount;
    private Integer installments;
    private LoanStatus status;
    private String reason;
    private String reviewedBy;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant canceledAt;

    private Loan(String id, String customerId, BigDecimal amount, Integer installments, LoanStatus status, String reason, String reviewedBy, Instant createdAt, Instant updatedAt, Instant canceledAt) {
        if (customerId == null || customerId.isBlank()) {
            throw new IllegalArgumentException("O identificador do cliente nao pode ser nulo ou vazio");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("O valor do emprestimo nao pode ser nulo ou negativo");
        }
        if (installments == null || installments <= 0) {
            throw new IllegalArgumentException("O numero de parcelas nao pode ser nulo ou negativo");
        }
        this.id = id;
        this.customerId = customerId;
        this.amount = amount;
        this.installments = installments;
        this.status = status;
        this.reason = reason;
        this.reviewedBy = reviewedBy;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.canceledAt = canceledAt;
    }

    public static Loan createProposal(String customerId, BigDecimal amount, Integer installments) {
        var now = Instant.now();
        var id = UUID.randomUUID();
        return new Loan(
                "L-" + id.toString(),
                customerId,
                amount,
                installments,
                LoanStatus.PENDING,
                null,
                null,
                now,
                now,
                null);
    }

    public static Loan restore(String id, String customerId, BigDecimal amount, Integer installments,
                           LoanStatus status, String reason, String reviewedBy,
                           Instant createdAt, Instant updatedAt, Instant canceledAt) {
    return new Loan(id, customerId, amount, installments, status, reason, reviewedBy, createdAt, updatedAt, canceledAt);
}

    private void transitionTo(LoanStatus nextStatus) {
        if (!this.status.canTransitionTo(nextStatus)) {
            throw new IllegalStateException("Transição inválida de " + this.status + " para " + nextStatus);
        }
        this.status = nextStatus;
        this.updatedAt = Instant.now();
    }

    public void approve(){
        transitionTo(LoanStatus.APPROVED);
    }

    public void reject(String reason){
        transitionTo(LoanStatus.REJECTED);
        this.reason = reason;
    }

    public void approveManually(String officerId, String justification){
        transitionTo(LoanStatus.APPROVED);
        this.reviewedBy = officerId;
        this.reason = justification;
    }

    public void cancel(String reason){
        transitionTo(LoanStatus.CANCELED);
        this.reason = reason;
        this.canceledAt = Instant.now();
    }

    public void compensateFailure(String reason){
        transitionTo(LoanStatus.CANCELED_DUE_TO_ERROR);
        this.reason = reason;
        this.canceledAt = Instant.now();
    }
}
