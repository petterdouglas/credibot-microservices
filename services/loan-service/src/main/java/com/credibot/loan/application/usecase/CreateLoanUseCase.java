package com.credibot.loan.application.usecase;

import java.math.BigDecimal;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.credibot.loan.application.port.OutboxEventPort;
import com.credibot.loan.application.service.LoanProjectionSyncService;
import com.credibot.loan.domain.event.LoanCreatedEvent;
import com.credibot.loan.domain.model.Loan;
import com.credibot.loan.domain.repository.LoanCommandRepository;

@Service
public class CreateLoanUseCase {

    private final LoanCommandRepository commandRepository;
    private final OutboxEventPort outboxEventPort;
    private final LoanProjectionSyncService projectionSyncService;

    public CreateLoanUseCase(
            LoanCommandRepository commandRepository,
            OutboxEventPort outboxEventPort,
            LoanProjectionSyncService projectionSyncService) {
        this.commandRepository = commandRepository;
        this.outboxEventPort = outboxEventPort;
        this.projectionSyncService = projectionSyncService;
    }

    @Transactional
    public Loan execute(String customerId, BigDecimal amount, Integer installments) {
        Loan proposal = Loan.createProposal(customerId, amount, installments);
        Loan saved = commandRepository.save(proposal);

        LoanCreatedEvent event = new LoanCreatedEvent(
                saved.getId(),
                saved.getCustomerId(),
                saved.getAmount(),
                saved.getInstallments(),
                saved.getCreatedAt()
        );
        outboxEventPort.enqueue("Loan", saved.getId(), "loan.created", event);
        projectionSyncService.sync(saved);

        return saved;
    }
}
