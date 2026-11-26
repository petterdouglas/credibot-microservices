package com.credibot.customer;

import java.math.BigDecimal;
import java.util.concurrent.TimeUnit;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class DepositListener {
    private static final String EXCHANGE = "credibot.events";
    private static final String QUEUE = "customer.deposit.credit-approved.queue";

    private record Approval(String loanId, String customerId, BigDecimal amount) {}
    private record Success(String loanId, String transactionId) {}
    private record Failure(String loanId, String reason) {}

    private final CustomerService customers;
    private final RabbitTemplate rabbit;
    private final ObjectMapper json;

    public DepositListener(CustomerService customers, RabbitTemplate rabbit, ObjectMapper json) {
        this.customers = customers;
        this.rabbit = rabbit;
        this.json = json;
    }

    @Bean
    Declarables depositQueue() {
        var exchange = new TopicExchange(EXCHANGE, true, false);
        var queue = QueueBuilder.durable(QUEUE).build();
        return new Declarables(exchange, queue, BindingBuilder.bind(queue).to(exchange).with("credit.approved"));
    }

    @RabbitListener(queues = QUEUE)
    public void process(Message message) throws Exception {
        Approval approval;
        try {
            approval = json.readerFor(Approval.class)
                    .without(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).readValue(message.getBody());
        } catch (java.io.IOException error) {
            throw new AmqpRejectAndDontRequeueException("Evento de aprovação inválido.", error);
        }

        if (approval == null || !validId(approval.loanId()) || !validId(approval.customerId())
                || approval.amount() == null || approval.amount().signum() <= 0
                || approval.amount().stripTrailingZeros().scale() > 2 || approval.amount().compareTo(new BigDecimal("10000000000000")) >= 0) {
            throw new AmqpRejectAndDontRequeueException("Evento de aprovação inválido.");
        }

        CustomerService.Deposit deposit;
        try {
            deposit = customers.deposit(approval.customerId(), approval.loanId(), approval.amount());
        } catch (ResponseStatusException error) {
            throw new AmqpRejectAndDontRequeueException(error.getReason(), error);
        }
        boolean success = deposit.failureReason() == null;
        Object outcome = success ? new Success(approval.loanId(), deposit.transactionId())
                : new Failure(approval.loanId(), deposit.failureReason());
        String routing = success ? "deposit.success" : "deposit.failed";
        var outbound = MessageBuilder.withBody(json.writeValueAsBytes(outcome))
                .setContentType(MessageProperties.CONTENT_TYPE_JSON)
                .setDeliveryMode(MessageDeliveryMode.PERSISTENT).build();

        // O saldo e o resultado já foram gravados. Se a publicação falhar, a fila pode reenviar a aprovação.
        var confirmation = new CorrelationData();
        rabbit.send(EXCHANGE, routing, outbound, confirmation);
        if (!confirmation.getFuture().get(5, TimeUnit.SECONDS).isAck() || confirmation.getReturned() != null) {
            throw new IllegalStateException("RabbitMQ não confirmou o encaminhamento de " + routing);
        }
    }

    private static boolean validId(String id) {
        return id != null && id.matches("[A-Za-z0-9_-]{1,64}");
    }
}
