package com.credibot.creditanalysis.infrastructure.messaging.publisher;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import com.credibot.creditanalysis.application.port.CreditEventPublisherPort;
import com.credibot.creditanalysis.domain.event.CreditApprovedEvent;
import com.credibot.creditanalysis.domain.event.CreditRejectedEvent;
import com.credibot.creditanalysis.infrastructure.config.RabbitMqConfig;

@Component
public class CreditEventPublisher implements CreditEventPublisherPort {

    private final RabbitTemplate rabbitTemplate;

    public CreditEventPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @Override
    public void publishApproved(CreditApprovedEvent event) {
        rabbitTemplate.convertAndSend(
                RabbitMqConfig.EXCHANGE_NAME,
                RabbitMqConfig.ROUTING_CREDIT_APPROVED,
                event);
    }

    @Override
    public void publishRejected(CreditRejectedEvent event) {
        rabbitTemplate.convertAndSend(
                RabbitMqConfig.EXCHANGE_NAME,
                RabbitMqConfig.ROUTING_CREDIT_REJECTED,
                event);
    }
}
