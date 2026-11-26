package com.credibot.loan.infrastructure.messaging.publisher;

import java.nio.charset.StandardCharsets;

import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import com.credibot.loan.infrastructure.config.RabbitMqConfig;
import com.credibot.loan.infrastructure.outbox.OutboxEventEntity;

@Component
public class LoanEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public LoanEventPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publishOutboxEvent(OutboxEventEntity event) {
        MessageProperties props = new MessageProperties();
        props.setContentType(MessageProperties.CONTENT_TYPE_JSON);
        props.setMessageId(event.getId().toString());
        props.setHeader("aggregateType", event.getAggregateType());
        props.setHeader("aggregateId", event.getAggregateId());

        Message message = new Message(event.getPayload().getBytes(StandardCharsets.UTF_8), props);
        rabbitTemplate.send(RabbitMqConfig.EXCHANGE_NAME, event.getEventType(), message);
    }
}
