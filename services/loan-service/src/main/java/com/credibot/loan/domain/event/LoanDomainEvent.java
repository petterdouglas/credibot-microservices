package com.credibot.loan.domain.event;

import java.time.Instant;

public sealed interface LoanDomainEvent permits LoanCreatedEvent, LoanStatusChangedEvent {
    String loanId();
    Instant occurredAt();
}
