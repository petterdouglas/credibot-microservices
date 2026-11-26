package com.credibot.creditanalysis.infrastructure.persistence;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import com.credibot.creditanalysis.domain.model.CreditAnalysis;
import com.credibot.creditanalysis.domain.model.CreditDecision;
import com.credibot.creditanalysis.domain.model.ScoreFactor;

@Document(collection = "credit_analyses")
public class CreditAnalysisDocument {

    @Id
    private String id;

    @Indexed(unique = true)
    private String loanId;

    private String customerId;
    private BigDecimal amount;
    private Integer installments;
    private int score;
    private CreditDecision decision;
    private String reason;
    private String modelVersion;
    private List<FactorDocument> factors;
    private Instant evaluatedAt;

    public CreditAnalysisDocument() {
    }

    public CreditAnalysisDocument(
            String id,
            String loanId,
            String customerId,
            BigDecimal amount,
            Integer installments,
            int score,
            CreditDecision decision,
            String reason,
            String modelVersion,
            List<FactorDocument> factors,
            Instant evaluatedAt) {
        this.id = id;
        this.loanId = loanId;
        this.customerId = customerId;
        this.amount = amount;
        this.installments = installments;
        this.score = score;
        this.decision = decision;
        this.reason = reason;
        this.modelVersion = modelVersion;
        this.factors = factors;
        this.evaluatedAt = evaluatedAt;
    }

    public static CreditAnalysisDocument fromDomain(CreditAnalysis analysis) {
        List<FactorDocument> factorDocs = analysis.getFactors().stream()
                .map(f -> new FactorDocument(f.factor(), f.weight()))
                .toList();
        return new CreditAnalysisDocument(
                analysis.getId(),
                analysis.getLoanId(),
                analysis.getCustomerId(),
                analysis.getAmount(),
                analysis.getInstallments(),
                analysis.getScore(),
                analysis.getDecision(),
                analysis.getReason(),
                analysis.getModelVersion(),
                factorDocs,
                analysis.getEvaluatedAt()
        );
    }

    public CreditAnalysis toDomain() {
        List<ScoreFactor> domainFactors = factors == null ? List.of() : factors.stream()
                .map(f -> new ScoreFactor(f.factor(), f.weight()))
                .toList();
        return CreditAnalysis.restore(
                id,
                loanId,
                customerId,
                amount,
                installments,
                score,
                decision,
                reason,
                modelVersion,
                domainFactors,
                evaluatedAt
        );
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
    public List<FactorDocument> getFactors() { return factors; }
    public Instant getEvaluatedAt() { return evaluatedAt; }

    public record FactorDocument(String factor, String weight) {
    }
}
