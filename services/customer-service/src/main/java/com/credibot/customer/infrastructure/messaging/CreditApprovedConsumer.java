package com.credibot.customer.infrastructure.messaging;

import java.math.BigDecimal;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.credibot.customer.domain.model.Customer;
import com.credibot.customer.domain.model.Wallet;
import com.credibot.customer.domain.repository.CustomerRepository;
import com.credibot.customer.domain.repository.WalletRepository;
import com.credibot.customer.infrastructure.config.RabbitMqConfig;

@Component
public class CreditApprovedConsumer {

    private static final Logger log = LoggerFactory.getLogger(CreditApprovedConsumer.class);

    // Só os campos necessários; os demais do CreditApprovedEvent são ignorados.
    public record CreditApprovedMessage(String loanId, String customerId, BigDecimal amount) {}
    public record DepositSuccessMessage(String loanId, String transactionId) {}
    public record DepositFailedMessage(String loanId, String reason) {}

    private final CustomerRepository customerRepository;
    private final WalletRepository walletRepository;
    private final RabbitTemplate rabbitTemplate;

    public CreditApprovedConsumer(CustomerRepository customerRepository,
                                  WalletRepository walletRepository,
                                  RabbitTemplate rabbitTemplate) {
        this.customerRepository = customerRepository;
        this.walletRepository = walletRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    @RabbitListener(queues = RabbitMqConfig.QUEUE_CREDIT_APPROVED)
    @Transactional
    public void onCreditApproved(CreditApprovedMessage msg) {
        Customer customer = customerRepository.findById(msg.customerId()).orElse(null);
        if (customer == null) {
            fail(msg.loanId(), "Cliente não encontrado.");
            return;
        }
        if (customer.isAccountBlocked()) {
            fail(msg.loanId(), "Conta bloqueada por suspeita de fraude.");
            return;
        }
        Wallet wallet = walletRepository.findByCustomerId(msg.customerId()).orElse(null);
        if (wallet == null) {
            fail(msg.loanId(), "Carteira não encontrada.");
            return;
        }

        wallet.setBalance(wallet.getBalance().add(msg.amount()));
        walletRepository.save(wallet);

        String tx = "TX-" + UUID.randomUUID();
        rabbitTemplate.convertAndSend(RabbitMqConfig.EXCHANGE_NAME, RabbitMqConfig.ROUTING_DEPOSIT_SUCCESS,
                new DepositSuccessMessage(msg.loanId(), tx));
        log.info("Depósito de {} para {} (loan={}, tx={})", msg.amount(), msg.customerId(), msg.loanId(), tx);
    }

    private void fail(String loanId, String reason) {
        rabbitTemplate.convertAndSend(RabbitMqConfig.EXCHANGE_NAME, RabbitMqConfig.ROUTING_DEPOSIT_FAILED,
                new DepositFailedMessage(loanId, reason));
        log.warn("Depósito falhou (loan={}): {}", loanId, reason);
    }
}