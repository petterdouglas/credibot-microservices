package com.credibot.creditanalysis.domain.event;

import java.time.Instant;

public record CreditRejectedEvent(
        String loanId,
        String reason,
        Instant evaluatedAt) {
}
