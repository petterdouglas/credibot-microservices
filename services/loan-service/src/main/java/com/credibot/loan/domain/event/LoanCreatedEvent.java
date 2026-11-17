package com.credibot.loan.domain.event;

import java.math.BigDecimal;
import java.time.Instant;

public record LoanCreatedEvent(String loanId, String customerId, BigDecimal amount, Integer installments, Instant occurredAt) implements LoanDomainEvent {}
