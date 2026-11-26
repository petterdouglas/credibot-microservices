package com.credibot.loan.application.port;

public interface OutboxEventPort {
    void enqueue(String aggregateType, String aggregateId, String eventType, Object payload);
}
