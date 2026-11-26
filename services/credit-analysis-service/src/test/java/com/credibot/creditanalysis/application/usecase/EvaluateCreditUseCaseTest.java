package com.credibot.creditanalysis.application.usecase;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.credibot.creditanalysis.application.port.CreditEventPublisherPort;
import com.credibot.creditanalysis.domain.event.CreditApprovedEvent;
import com.credibot.creditanalysis.domain.event.CreditRejectedEvent;
import com.credibot.creditanalysis.domain.model.CreditAnalysis;
import com.credibot.creditanalysis.domain.model.CreditDecision;
import com.credibot.creditanalysis.domain.repository.CreditAnalysisRepository;
import com.credibot.creditanalysis.domain.score.CreditScoreEngine;

@ExtendWith(MockitoExtension.class)
class EvaluateCreditUseCaseTest {

    @Mock
    private CreditAnalysisRepository repository;

    @Mock
    private CreditEventPublisherPort eventPublisher;

    @InjectMocks
    private EvaluateCreditUseCase useCase;

    @Test
    void shouldEvaluateAndPublishApprovedEvent() {
        when(repository.findByLoanId("L-100")).thenReturn(Optional.empty());
        when(repository.save(any(CreditAnalysis.class))).thenAnswer(inv -> inv.getArgument(0));

        CreditAnalysis result = useCase.execute("L-100", "C-1122", new BigDecimal("500.00"), 6);

        assertEquals(CreditDecision.APPROVED, result.getDecision());
        verify(repository).save(any(CreditAnalysis.class));
        verify(eventPublisher).publishApproved(any(CreditApprovedEvent.class));
        verify(eventPublisher, never()).publishRejected(any());
    }

    @Test
    void shouldEvaluateAndPublishRejectedEvent() {
        when(repository.findByLoanId("L-200")).thenReturn(Optional.empty());
        when(repository.save(any(CreditAnalysis.class))).thenAnswer(inv -> inv.getArgument(0));

        CreditAnalysis result = useCase.execute("L-200", "C-RISK-99", new BigDecimal("15000.00"), 36);

        assertEquals(CreditDecision.REJECTED, result.getDecision());
        verify(eventPublisher).publishRejected(any(CreditRejectedEvent.class));
        verify(eventPublisher, never()).publishApproved(any());
    }

    @Test
    void shouldBeIdempotentWhenAnalysisAlreadyExists() {
        CreditAnalysis existing = new CreditScoreEngine()
                .analyze("L-300", "C-1122", new BigDecimal("500.00"), 6);
        when(repository.findByLoanId("L-300")).thenReturn(Optional.of(existing));

        CreditAnalysis result = useCase.execute("L-300", "C-1122", new BigDecimal("500.00"), 6);

        assertSame(existing, result);
        verify(repository, never()).save(any());
        verifyNoInteractions(eventPublisher);
    }
}
