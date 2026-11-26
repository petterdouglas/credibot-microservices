package com.credibot.creditanalysis.infrastructure.messaging.consumer;

import java.math.BigDecimal;
import java.time.Instant;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import com.credibot.creditanalysis.application.usecase.EvaluateCreditUseCase;
import com.credibot.creditanalysis.infrastructure.config.RabbitMqConfig;

@Component
public class LoanCreatedConsumer {

    private final EvaluateCreditUseCase evaluateCreditUseCase;

    public LoanCreatedConsumer(EvaluateCreditUseCase evaluateCreditUseCase) {
        this.evaluateCreditUseCase = evaluateCreditUseCase;
    }

    @RabbitListener(queues = RabbitMqConfig.QUEUE_LOAN_CREATED)
    public void onLoanCreated(LoanCreatedMessage message) {
        evaluateCreditUseCase.execute(
                message.loanId(),
                message.customerId(),
                message.amount(),
                message.installments()
        );
    }

    public record LoanCreatedMessage(
            String loanId,
            String customerId,
            BigDecimal amount,
            Integer installments,
            Instant occurredAt) {
    }
}
