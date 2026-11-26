package com.credibot.creditanalysis.domain.rules;

import java.math.BigDecimal;

import com.credibot.creditanalysis.domain.model.ScoreFactor;

public class CustomerHistoryRule implements CreditRule {

    @Override
    public RuleResult evaluate(String customerId, BigDecimal amount, Integer installments) {
        String normalized = customerId.toUpperCase();
        if (normalized.contains("RISK") || normalized.endsWith("99")) {
            return new RuleResult(-30, new ScoreFactor("Histórico de inadimplência recente", "-30"));
        }
        return new RuleResult(25, new ScoreFactor("Histórico pontual", "+25"));
    }
}
