package com.credibot.loan.infrastructure.outbox;

import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.credibot.loan.infrastructure.messaging.publisher.LoanEventPublisher;

@Component
public class OutboxRelayScheduler {

    private static final Logger log = LoggerFactory.getLogger(OutboxRelayScheduler.class);

    private final OutboxRepository outboxRepository;
    private final LoanEventPublisher eventPublisher;
    private final int batchSize;

    public OutboxRelayScheduler(
            OutboxRepository outboxRepository,
            LoanEventPublisher eventPublisher,
            @Value("${credibot.outbox.batch-size:50}") int batchSize) {
        this.outboxRepository = outboxRepository;
        this.eventPublisher = eventPublisher;
        this.batchSize = batchSize;
    }

    @Scheduled(fixedDelayString = "${credibot.outbox.polling-interval-ms:1000}")
    @Transactional
    public void pollAndPublish() {
        List<OutboxEventEntity> pending = outboxRepository.findByStatusOrderByCreatedAtAsc(
                OutboxStatus.PENDING,
                PageRequest.of(0, batchSize)
        );
        for (OutboxEventEntity event : pending) {
            try {
                eventPublisher.publishOutboxEvent(event);
                event.setStatus(OutboxStatus.PUBLISHED);
                event.setPublishedAt(Instant.now());
                outboxRepository.save(event);
            } catch (Exception ex) {
                log.error("Falha ao publicar evento outbox {} ({}): {}",
                        event.getId(), event.getEventType(), ex.getMessage());
            }
        }
    }
}
