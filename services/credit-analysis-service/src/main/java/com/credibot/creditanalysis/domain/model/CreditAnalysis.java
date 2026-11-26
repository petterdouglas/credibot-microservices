package com.credibot.creditanalysis.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class CreditAnalysis {

    private final String id;
    private final String loanId;
    private final String customerId;
    private final BigDecimal amount;
    private final Integer installments;
    private final int score;
    private final CreditDecision decision;
    private final String reason;
    private final String modelVersion;
    private final List<ScoreFactor> factors;
    private final Instant evaluatedAt;

    private CreditAnalysis(
            String id,
            String loanId,
            String customerId,
            BigDecimal amount,
            Integer installments,
            int score,
            CreditDecision decision,
            String reason,
            String modelVersion,
            List<ScoreFactor> factors,
            Instant evaluatedAt) {
        if (loanId == null || loanId.isBlank()) {
            throw new IllegalArgumentException("loanId não pode ser nulo ou vazio");
        }
        if (customerId == null || customerId.isBlank()) {
            throw new IllegalArgumentException("customerId não pode ser nulo ou vazio");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("amount deve ser positivo");
        }
        if (installments == null || installments <= 0) {
            throw new IllegalArgumentException("installments deve ser positivo");
        }
        this.id = id;
        this.loanId = loanId;
        this.customerId = customerId;
        this.amount = amount;
        this.installments = installments;
        this.score = score;
        this.decision = decision;
        this.reason = reason;
        this.modelVersion = modelVersion;
        this.factors = List.copyOf(factors);
        this.evaluatedAt = evaluatedAt;
    }

    public static CreditAnalysis create(
            String loanId,
            String customerId,
            BigDecimal amount,
            Integer installments,
            int score,
            CreditDecision decision,
            String reason,
            String modelVersion,
            List<ScoreFactor> factors) {
        return new CreditAnalysis(
                "CA-" + UUID.randomUUID(),
                loanId,
                customerId,
                amount,
                installments,
                score,
                decision,
                reason,
                modelVersion,
                factors,
                Instant.now());
    }

    public static CreditAnalysis restore(
            String id,
            String loanId,
            String customerId,
            BigDecimal amount,
            Integer installments,
            int score,
            CreditDecision decision,
            String reason,
            String modelVersion,
            List<ScoreFactor> factors,
            Instant evaluatedAt) {
        return new CreditAnalysis(
                id,
                loanId,
                customerId,
                amount,
                installments,
                score,
                decision,
                reason,
                modelVersion,
                factors,
                evaluatedAt);
    }

    public String getId() { return id; }
    public String getLoanId() { return loanId; }
    public String getCustomerId() { return customerId; }
    public BigDecimal getAmount() { return amount; }
    public Integer getInstallments() { return installments; }
    public int getScore() { return score; }
    public CreditDecision getDecision() { return decision; }
    public String getReason() { return reason; }
    public String getModelVersion() { return modelVersion; }
    public List<ScoreFactor> getFactors() { return factors; }
    public Instant getEvaluatedAt() { return evaluatedAt; }
}
