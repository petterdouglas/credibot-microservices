package com.credibot.creditanalysis.domain.rules;

import java.math.BigDecimal;

import com.credibot.creditanalysis.domain.model.ScoreFactor;

public class AmountThresholdRule implements CreditRule {

    private static final BigDecimal LOW_MICROCREDIT = new BigDecimal("2000.00");
    private static final BigDecimal MEDIUM_MICROCREDIT = new BigDecimal("5000.00");

    @Override
    public RuleResult evaluate(String customerId, BigDecimal amount, Integer installments) {
        if (amount.compareTo(LOW_MICROCREDIT) <= 0) {
            return new RuleResult(30, new ScoreFactor("Valor compatível com microcrédito", "+30"));
        }
        if (amount.compareTo(MEDIUM_MICROCREDIT) <= 0) {
            return new RuleResult(15, new ScoreFactor("Valor moderado dentro da política", "+15"));
        }
        return new RuleResult(-25, new ScoreFactor("Valor elevado acima do limite de baixo risco", "-25"));
    }
}
