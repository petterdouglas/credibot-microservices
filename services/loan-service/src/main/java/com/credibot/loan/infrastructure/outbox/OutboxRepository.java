package com.credibot.loan.infrastructure.outbox;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OutboxRepository extends JpaRepository<OutboxEventEntity, UUID> {

    List<OutboxEventEntity> findByStatusOrderByCreatedAtAsc(OutboxStatus status, Pageable pageable);

    /**
     * Eventos pendentes prontos para publicação. Eventos do tipo {@code delayedType}
     * só ficam prontos depois de {@code delayedCutoff} (janela de revisão manual).
     */
    @Query("""
            SELECT e FROM OutboxEventEntity e
            WHERE e.status = :status
              AND (e.eventType <> :delayedType OR e.createdAt <= :delayedCutoff)
            ORDER BY e.createdAt ASC
            """)
    List<OutboxEventEntity> findReadyToPublish(
            @Param("status") OutboxStatus status,
            @Param("delayedType") String delayedType,
            @Param("delayedCutoff") Instant delayedCutoff,
            Pageable pageable);
}
