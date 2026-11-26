package com.credibot.creditanalysis.domain.score;

import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

import com.credibot.creditanalysis.domain.model.CreditAnalysis;
import com.credibot.creditanalysis.domain.model.CreditDecision;

class CreditScoreEngineTest {

    private final CreditScoreEngine engine = new CreditScoreEngine();

    @Test
    void shouldApproveLowRiskMicrocreditProposal() {
        CreditAnalysis analysis = engine.analyze("L-9988", "C-1122", new BigDecimal("500.00"), 6);

        assertEquals("L-9988", analysis.getLoanId());
        assertEquals(CreditDecision.APPROVED, analysis.getDecision());
        assertEquals(100, analysis.getScore());
        assertEquals("v2.1", analysis.getModelVersion());
        assertEquals(3, analysis.getFactors().size());
    }

    @Test
    void shouldRejectHighRiskProposal() {
        CreditAnalysis analysis = engine.analyze("L-7777", "C-RISK-99", new BigDecimal("15000.00"), 36);

        assertEquals(CreditDecision.REJECTED, analysis.getDecision());
        assertTrue(analysis.getScore() < 60);
    }
}
