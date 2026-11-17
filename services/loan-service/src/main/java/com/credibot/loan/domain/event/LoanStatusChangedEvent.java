package com.credibot.loan.domain.event;

import java.math.BigDecimal;
import java.time.Instant;

import com.credibot.loan.domain.model.LoanStatus;

public final record LoanStatusChangedEvent(String loanId, String customerId, BigDecimal amount, LoanStatus oldStatus, LoanStatus newStatus, String reason, Instant occurredAt) implements LoanDomainEvent {}
