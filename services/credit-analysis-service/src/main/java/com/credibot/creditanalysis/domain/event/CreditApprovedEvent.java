package com.credibot.creditanalysis.domain.event;

import java.math.BigDecimal;
import java.time.Instant;

public record CreditApprovedEvent(
        String loanId,
        String customerId,
        BigDecimal amount,
        int score,
        Instant evaluatedAt) {
}
