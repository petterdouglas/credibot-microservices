package com.credibot.loan.infrastructure.outbox;

public enum OutboxStatus {
    PENDING,
    PUBLISHED,
    FAILED,
    /** Evento descartado sem publicar (ex.: loan.created de empréstimo já revisado manualmente). */
    SKIPPED
}
