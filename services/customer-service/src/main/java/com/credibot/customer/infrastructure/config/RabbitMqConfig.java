package com.credibot.customer.infrastructure.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

    public static final String EXCHANGE_NAME = "credibot.events";
    public static final String QUEUE_CREDIT_APPROVED = "customer.deposit.credit-approved.queue";
    public static final String ROUTING_CREDIT_APPROVED = "credit.approved";
    public static final String ROUTING_DEPOSIT_SUCCESS = "deposit.success";
    public static final String ROUTING_DEPOSIT_FAILED = "deposit.failed";

    @Bean
    public TopicExchange credibotEventsExchange() {
        return new TopicExchange(EXCHANGE_NAME, true, false);
    }

    @Bean
    public Queue creditApprovedQueue() {
        return QueueBuilder.durable(QUEUE_CREDIT_APPROVED).build();
    }

    @Bean
    public Binding creditApprovedBinding(Queue creditApprovedQueue, TopicExchange credibotEventsExchange) {
        return BindingBuilder.bind(creditApprovedQueue).to(credibotEventsExchange).with(ROUTING_CREDIT_APPROVED);
    }

    @Bean
    public MessageConverter jackson2JsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}