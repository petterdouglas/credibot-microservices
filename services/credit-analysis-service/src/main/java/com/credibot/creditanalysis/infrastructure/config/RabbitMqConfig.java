package com.credibot.creditanalysis.infrastructure.config;

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
    public static final String QUEUE_LOAN_CREATED = "credit.analysis.loan-created.queue";
    public static final String ROUTING_LOAN_CREATED = "loan.created";
    public static final String ROUTING_CREDIT_APPROVED = "credit.approved";
    public static final String ROUTING_CREDIT_REJECTED = "credit.rejected";

    @Bean
    public TopicExchange credibotEventsExchange() {
        return new TopicExchange(EXCHANGE_NAME, true, false);
    }

    @Bean
    public Queue loanCreatedQueue() {
        return QueueBuilder.durable(QUEUE_LOAN_CREATED).build();
    }

    @Bean
    public Binding loanCreatedBinding(Queue loanCreatedQueue, TopicExchange credibotEventsExchange) {
        return BindingBuilder.bind(loanCreatedQueue).to(credibotEventsExchange).with(ROUTING_LOAN_CREATED);
    }

    @Bean
    public MessageConverter jackson2JsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
