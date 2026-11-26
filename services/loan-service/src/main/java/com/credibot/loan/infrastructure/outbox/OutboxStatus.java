package com.credibot.loan.infrastructure.outbox;

public enum OutboxStatus {
    PENDING,
    PUBLISHED,
    FAILED
}
