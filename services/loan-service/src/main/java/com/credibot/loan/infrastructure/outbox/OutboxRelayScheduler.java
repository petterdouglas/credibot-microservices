package com.credibot.loan.infrastructure.outbox;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.credibot.loan.domain.model.LoanStatus;
import com.credibot.loan.domain.repository.LoanCommandRepository;
import com.credibot.loan.infrastructure.messaging.publisher.LoanEventPublisher;

@Component
public class OutboxRelayScheduler {

    private static final Logger log = LoggerFactory.getLogger(OutboxRelayScheduler.class);

    /** Evento que dispara a análise automática de crédito — é o único atrasado. */
    static final String LOAN_CREATED = "loan.created";

    private final OutboxRepository outboxRepository;
    private final LoanEventPublisher eventPublisher;
    private final LoanCommandRepository loanRepository;
    private final int batchSize;
    private final Duration autoAnalysisDelay;

    public OutboxRelayScheduler(
            OutboxRepository outboxRepository,
            LoanEventPublisher eventPublisher,
            LoanCommandRepository loanRepository,
            @Value("${credibot.outbox.batch-size:50}") int batchSize,
            @Value("${credibot.loan.auto-analysis-delay-seconds:300}") long autoAnalysisDelaySeconds) {
        this.outboxRepository = outboxRepository;
        this.eventPublisher = eventPublisher;
        this.loanRepository = loanRepository;
        this.batchSize = batchSize;
        this.autoAnalysisDelay = Duration.ofSeconds(autoAnalysisDelaySeconds);
    }

    @Scheduled(fixedDelayString = "${credibot.outbox.polling-interval-ms:1000}")
    @Transactional
    public void pollAndPublish() {
        // loan.created só é publicado após a janela de revisão manual; os demais saem na hora.
        List<OutboxEventEntity> ready = outboxRepository.findReadyToPublish(
                OutboxStatus.PENDING,
                LOAN_CREATED,
                Instant.now().minus(autoAnalysisDelay),
                PageRequest.of(0, batchSize)
        );
        for (OutboxEventEntity event : ready) {
            try {
                if (LOAN_CREATED.equals(event.getEventType()) && alreadyDecided(event.getAggregateId())) {
                    // A mesa de crédito decidiu dentro da janela: não dispara a análise automática.
                    event.setStatus(OutboxStatus.SKIPPED);
                    outboxRepository.save(event);
                    log.info("Análise automática descartada para empréstimo {}: já revisado manualmente",
                            event.getAggregateId());
                    continue;
                }
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

    private boolean alreadyDecided(String loanId) {
        return loanRepository.findById(loanId)
                .map(loan -> loan.getStatus() != LoanStatus.PENDING)
                .orElse(false);
    }
}
