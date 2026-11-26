package com.credibot.creditanalysis.domain.score;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import com.credibot.creditanalysis.domain.model.CreditAnalysis;
import com.credibot.creditanalysis.domain.model.CreditDecision;
import com.credibot.creditanalysis.domain.model.ScoreFactor;
import com.credibot.creditanalysis.domain.rules.AmountThresholdRule;
import com.credibot.creditanalysis.domain.rules.CreditRule;
import com.credibot.creditanalysis.domain.rules.CreditRule.RuleResult;
import com.credibot.creditanalysis.domain.rules.CustomerHistoryRule;
import com.credibot.creditanalysis.domain.rules.InstallmentsRiskRule;

public class CreditScoreEngine {

    public static final String MODEL_VERSION = "v2.1";
    private static final int BASE_SCORE = 25;
    private static final int APPROVAL_THRESHOLD = 60;

    private final List<CreditRule> rules;

    public CreditScoreEngine() {
        this(List.of(
                new AmountThresholdRule(),
                new InstallmentsRiskRule(),
                new CustomerHistoryRule()
        ));
    }

    public CreditScoreEngine(List<CreditRule> rules) {
        this.rules = List.copyOf(rules);
    }

    public CreditAnalysis analyze(String loanId, String customerId, BigDecimal amount, Integer installments) {
        int rawScore = BASE_SCORE;
        List<ScoreFactor> factors = new ArrayList<>();

        for (CreditRule rule : rules) {
            RuleResult result = rule.evaluate(customerId, amount, installments);
            rawScore += result.delta();
            factors.add(result.factor());
        }

        int finalScore = Math.max(0, Math.min(100, rawScore));
        CreditDecision decision = finalScore >= APPROVAL_THRESHOLD
                ? CreditDecision.APPROVED
                : CreditDecision.REJECTED;

        String reason = decision == CreditDecision.APPROVED
                ? "Score " + finalScore + " atinge o mínimo exigido (" + APPROVAL_THRESHOLD + ")"
                : "Score " + finalScore + " abaixo do mínimo exigido (" + APPROVAL_THRESHOLD + ")";

        return CreditAnalysis.create(
                loanId,
                customerId,
                amount,
                installments,
                finalScore,
                decision,
                reason,
                MODEL_VERSION,
                factors
        );
    }
}
