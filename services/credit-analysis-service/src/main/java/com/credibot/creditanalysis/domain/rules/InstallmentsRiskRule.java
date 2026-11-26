package com.credibot.creditanalysis.domain.rules;

import java.math.BigDecimal;

import com.credibot.creditanalysis.domain.model.ScoreFactor;

public class InstallmentsRiskRule implements CreditRule {

    @Override
    public RuleResult evaluate(String customerId, BigDecimal amount, Integer installments) {
        if (installments <= 12) {
            return new RuleResult(20, new ScoreFactor("Prazo curto de pagamento", "+20"));
        }
        if (installments <= 24) {
            return new RuleResult(5, new ScoreFactor("Prazo intermediário de pagamento", "+5"));
        }
        return new RuleResult(-20, new ScoreFactor("Prazo longo aumenta exposição ao risco", "-20"));
    }
}
