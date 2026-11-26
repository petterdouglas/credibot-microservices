package com.credibot.loan.domain.model;

import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

import com.credibot.loan.domain.exception.InvalidLoanStateTransitionException;

class LoanTest {

    @Test
    void shouldCreateProposalInPendingStatus() {
        Loan loan = Loan.createProposal("C-1122", new BigDecimal("500.00"), 6);

        assertNotNull(loan.getId());
        assertTrue(loan.getId().startsWith("L-"));
        assertEquals("C-1122", loan.getCustomerId());
        assertEquals(new BigDecimal("500.00"), loan.getAmount());
        assertEquals(6, loan.getInstallments());
        assertEquals(LoanStatus.PENDING, loan.getStatus());
        assertNotNull(loan.getCreatedAt());
        assertNotNull(loan.getUpdatedAt());
        assertNull(loan.getCanceledAt());
    }

    @Test
    void shouldRejectInvalidProposalInputs() {
        assertThrows(IllegalArgumentException.class,
                () -> Loan.createProposal("", new BigDecimal("500.00"), 6));
        assertThrows(IllegalArgumentException.class,
                () -> Loan.createProposal("C-1122", BigDecimal.ZERO, 6));
        assertThrows(IllegalArgumentException.class,
                () -> Loan.createProposal("C-1122", new BigDecimal("500.00"), 0));
    }

    @Test
    void shouldTransitionFromPendingToApproved() {
        Loan loan = Loan.createProposal("C-1122", new BigDecimal("500.00"), 6);
        loan.approve();

        assertEquals(LoanStatus.APPROVED, loan.getStatus());
    }

    @Test
    void shouldApproveManuallyRecordingOfficerAndJustification() {
        Loan loan = Loan.createProposal("C-1122", new BigDecimal("500.00"), 6);
        loan.approveManually("EMP-007", "Comprovante aceito");

        assertEquals(LoanStatus.APPROVED, loan.getStatus());
        assertEquals("EMP-007", loan.getReviewedBy());
        assertEquals("Comprovante aceito", loan.getReason());
    }

    @Test
    void shouldTransitionFromPendingToRejected() {
        Loan loan = Loan.createProposal("C-1122", new BigDecimal("500.00"), 6);
        loan.reject("Score insuficiente");

        assertEquals(LoanStatus.REJECTED, loan.getStatus());
        assertEquals("Score insuficiente", loan.getReason());
    }

    @Test
    void shouldTransitionFromPendingToCanceled() {
        Loan loan = Loan.createProposal("C-1122", new BigDecimal("500.00"), 6);
        loan.cancel("Desistência do cliente");

        assertEquals(LoanStatus.CANCELED, loan.getStatus());
        assertEquals("Desistência do cliente", loan.getReason());
        assertNotNull(loan.getCanceledAt());
    }

    @Test
    void shouldCompensateFailureFromPendingToCanceledDueToError() {
        Loan loan = Loan.createProposal("C-1122", new BigDecimal("500.00"), 6);
        loan.compensateFailure("Conta bloqueada por fraude");

        assertEquals(LoanStatus.CANCELED_DUE_TO_ERROR, loan.getStatus());
        assertEquals("Conta bloqueada por fraude", loan.getReason());
        assertNotNull(loan.getCanceledAt());
    }

    @Test
    void shouldThrowOnInvalidTransitionFromTerminalState() {
        Loan loan = Loan.createProposal("C-1122", new BigDecimal("500.00"), 6);
        loan.approve();

        assertThrows(InvalidLoanStateTransitionException.class, () -> loan.cancel("Tarde demais"));
        assertThrows(InvalidLoanStateTransitionException.class, () -> loan.reject("Erro"));
        assertThrows(InvalidLoanStateTransitionException.class, () -> loan.compensateFailure("Erro"));
    }

    @Test
    void shouldNotAllowTransitionToSameOrNullStatus() {
        assertFalse(LoanStatus.PENDING.canTransitionTo(LoanStatus.PENDING));
        assertFalse(LoanStatus.PENDING.canTransitionTo(null));
        assertTrue(LoanStatus.PENDING.canTransitionTo(LoanStatus.APPROVED));
    }
}
