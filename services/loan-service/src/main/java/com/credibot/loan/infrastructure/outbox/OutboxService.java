package com.credibot.loan.infrastructure.outbox;

import java.time.Instant;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.credibot.loan.application.port.OutboxEventPort;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class OutboxService implements OutboxEventPort {

    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    public OutboxService(OutboxRepository outboxRepository, ObjectMapper objectMapper) {
        this.outboxRepository = outboxRepository;
        this.objectMapper = objectMapper;
    }

    public void enqueue(String aggregateType, String aggregateId, String eventType, Object payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            OutboxEventEntity entity = new OutboxEventEntity(
                    UUID.randomUUID(),
                    aggregateType,
                    aggregateId,
                    eventType,
                    json,
                    OutboxStatus.PENDING,
                    Instant.now(),
                    null
            );
            outboxRepository.save(entity);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Erro ao serializar payload de outbox para " + eventType, ex);
        }
    }
}
