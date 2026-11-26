package com.credibot.loan.application.usecase;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.credibot.loan.application.port.OutboxEventPort;
import com.credibot.loan.application.service.LoanProjectionSyncService;
import com.credibot.loan.application.service.SagaCompensationService;
import com.credibot.loan.domain.event.LoanCreatedEvent;
import com.credibot.loan.domain.model.Loan;
import com.credibot.loan.domain.model.LoanStatus;
import com.credibot.loan.domain.repository.LoanCommandRepository;

@ExtendWith(MockitoExtension.class)
class LoanApplicationFlowTest {

    @Mock
    private LoanCommandRepository commandRepository;

    @Mock
    private OutboxEventPort outboxEventPort;

    @Mock
    private LoanProjectionSyncService projectionSyncService;

    @InjectMocks
    private CreateLoanUseCase createLoanUseCase;

    @InjectMocks
    private SagaCompensationService sagaCompensationService;

    @Test
    void shouldPersistLoanEnqueueOutboxAndSyncReadModel() {
        when(commandRepository.save(any(Loan.class))).thenAnswer(inv -> inv.getArgument(0));

        Loan created = createLoanUseCase.execute("C-1122", new BigDecimal("500.00"), 6);

        assertEquals(LoanStatus.PENDING, created.getStatus());
        verify(commandRepository).save(any(Loan.class));
        verify(outboxEventPort).enqueue(eq("Loan"), eq(created.getId()), eq("loan.created"), any(LoanCreatedEvent.class));
        verify(projectionSyncService).sync(created);
    }

    @Test
    void shouldApproveLoanOnDepositSuccess() {
        Loan pending = Loan.createProposal("C-1122", new BigDecimal("500.00"), 6);
        when(commandRepository.findById(pending.getId())).thenReturn(Optional.of(pending));
        when(commandRepository.save(any(Loan.class))).thenAnswer(inv -> inv.getArgument(0));

        sagaCompensationService.handleDepositSuccess(pending.getId(), "TX-4455");

        assertEquals(LoanStatus.APPROVED, pending.getStatus());
        verify(projectionSyncService).sync(pending);
    }

    @Test
    void shouldCompensateLoanOnDepositFailed() {
        Loan pending = Loan.createProposal("C-1122", new BigDecimal("500.00"), 6);
        when(commandRepository.findById(pending.getId())).thenReturn(Optional.of(pending));
        when(commandRepository.save(any(Loan.class))).thenAnswer(inv -> inv.getArgument(0));

        sagaCompensationService.handleDepositFailed(pending.getId(), "Conta bloqueada");

        assertEquals(LoanStatus.CANCELED_DUE_TO_ERROR, pending.getStatus());
        assertEquals("Conta bloqueada", pending.getReason());
        assertNotNull(pending.getCanceledAt());
        verify(projectionSyncService).sync(pending);
    }

    @Test
    void shouldBeIdempotentWhenSagaEventArrivesTwice() {
        Loan approved = Loan.createProposal("C-1122", new BigDecimal("500.00"), 6);
        approved.approve();
        when(commandRepository.findById(approved.getId())).thenReturn(Optional.of(approved));

        sagaCompensationService.handleDepositSuccess(approved.getId(), "TX-4455");

        verify(commandRepository, never()).save(any());
        verify(projectionSyncService, never()).sync(any());
    }
}
