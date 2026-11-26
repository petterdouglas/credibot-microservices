package com.credibot.creditanalysis.domain.rules;

import java.math.BigDecimal;

import com.credibot.creditanalysis.domain.model.ScoreFactor;

public interface CreditRule {

    RuleResult evaluate(String customerId, BigDecimal amount, Integer installments);

    record RuleResult(int delta, ScoreFactor factor) {
    }
}
