package com.credibot.creditanalysis.api.dto;

import java.time.Instant;
import java.util.List;

import com.credibot.creditanalysis.domain.model.CreditDecision;

public record CreditAuditResponse(
        String loanId,
        int score,
        CreditDecision decision,
        String modelVersion,
        List<ScoreFactorResponse> factors,
        Instant evaluatedAt) {

    public record ScoreFactorResponse(String factor, String weight) {
    }
}
