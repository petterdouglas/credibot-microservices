package com.credibot.loan.infrastructure.messaging.consumer;

public final class SagaMessages {

    private SagaMessages() {
    }

    public record CreditRejectedMessage(String loanId, String reason) {
    }

    public record DepositSuccessMessage(String loanId, String transactionId) {
    }

    public record DepositFailedMessage(String loanId, String reason) {
    }
}
