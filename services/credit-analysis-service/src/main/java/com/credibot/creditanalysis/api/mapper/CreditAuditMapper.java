package com.credibot.creditanalysis.api.mapper;

import java.util.List;

import org.springframework.stereotype.Component;

import com.credibot.creditanalysis.api.dto.CreditAuditResponse;
import com.credibot.creditanalysis.api.dto.CreditAuditResponse.ScoreFactorResponse;
import com.credibot.creditanalysis.domain.model.CreditAnalysis;

@Component
public class CreditAuditMapper {

    public CreditAuditResponse toResponse(CreditAnalysis analysis) {
        List<ScoreFactorResponse> factors = analysis.getFactors().stream()
                .map(f -> new ScoreFactorResponse(f.factor(), f.weight()))
                .toList();
        return new CreditAuditResponse(
                analysis.getLoanId(),
                analysis.getScore(),
                analysis.getDecision(),
                analysis.getModelVersion(),
                factors,
                analysis.getEvaluatedAt()
        );
    }
}
