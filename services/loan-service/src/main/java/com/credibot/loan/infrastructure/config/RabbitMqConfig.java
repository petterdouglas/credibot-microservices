package com.credibot.loan.infrastructure.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

    public static final String EXCHANGE_NAME = "credibot.events";

    public static final String QUEUE_CREDIT_REJECTED = "loan.saga.credit-rejected.queue";
    public static final String QUEUE_DEPOSIT_SUCCESS = "loan.saga.deposit-success.queue";
    public static final String QUEUE_DEPOSIT_FAILED = "loan.saga.deposit-failed.queue";

    public static final String ROUTING_CREDIT_REJECTED = "credit.rejected";
    public static final String ROUTING_DEPOSIT_SUCCESS = "deposit.success";
    public static final String ROUTING_DEPOSIT_FAILED = "deposit.failed";

    @Bean
    public TopicExchange credibotEventsExchange() {
        return new TopicExchange(EXCHANGE_NAME, true, false);
    }

    @Bean
    public Queue creditRejectedQueue() {
        return QueueBuilder.durable(QUEUE_CREDIT_REJECTED).build();
    }

    @Bean
    public Queue depositSuccessQueue() {
        return QueueBuilder.durable(QUEUE_DEPOSIT_SUCCESS).build();
    }

    @Bean
    public Queue depositFailedQueue() {
        return QueueBuilder.durable(QUEUE_DEPOSIT_FAILED).build();
    }

    @Bean
    public Binding creditRejectedBinding(Queue creditRejectedQueue, TopicExchange credibotEventsExchange) {
        return BindingBuilder.bind(creditRejectedQueue).to(credibotEventsExchange).with(ROUTING_CREDIT_REJECTED);
    }

    @Bean
    public Binding depositSuccessBinding(Queue depositSuccessQueue, TopicExchange credibotEventsExchange) {
        return BindingBuilder.bind(depositSuccessQueue).to(credibotEventsExchange).with(ROUTING_DEPOSIT_SUCCESS);
    }

    @Bean
    public Binding depositFailedBinding(Queue depositFailedQueue, TopicExchange credibotEventsExchange) {
        return BindingBuilder.bind(depositFailedQueue).to(credibotEventsExchange).with(ROUTING_DEPOSIT_FAILED);
    }

    @Bean
    public MessageConverter jackson2JsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
