package com.credibot.loan.infrastructure.messaging.consumer;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import com.credibot.loan.application.service.SagaCompensationService;
import com.credibot.loan.infrastructure.config.RabbitMqConfig;
import com.credibot.loan.infrastructure.messaging.consumer.SagaMessages.CreditRejectedMessage;
import com.credibot.loan.infrastructure.messaging.consumer.SagaMessages.DepositFailedMessage;
import com.credibot.loan.infrastructure.messaging.consumer.SagaMessages.DepositSuccessMessage;

@Component
public class SagaEventConsumer {

    private final SagaCompensationService sagaService;

    public SagaEventConsumer(SagaCompensationService sagaService) {
        this.sagaService = sagaService;
    }

    @RabbitListener(queues = RabbitMqConfig.QUEUE_CREDIT_REJECTED)
    public void onCreditRejected(CreditRejectedMessage message) {
        sagaService.handleCreditRejected(message.loanId(), message.reason());
    }

    @RabbitListener(queues = RabbitMqConfig.QUEUE_DEPOSIT_SUCCESS)
    public void onDepositSuccess(DepositSuccessMessage message) {
        sagaService.handleDepositSuccess(message.loanId(), message.transactionId());
    }

    @RabbitListener(queues = RabbitMqConfig.QUEUE_DEPOSIT_FAILED)
    public void onDepositFailed(DepositFailedMessage message) {
        sagaService.handleDepositFailed(message.loanId(), message.reason());
    }
}
