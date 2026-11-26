package com.credibot.loan.application.usecase;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.credibot.loan.application.port.OutboxEventPort;
import com.credibot.loan.application.service.LoanProjectionSyncService;
import com.credibot.loan.domain.event.LoanStatusChangedEvent;
import com.credibot.loan.domain.exception.LoanNotFoundException;
import com.credibot.loan.domain.model.Loan;
import com.credibot.loan.domain.model.LoanStatus;
import com.credibot.loan.domain.repository.LoanCommandRepository;

@Service
public class ReviewLoanUseCase {

    private final LoanCommandRepository commandRepository;
    private final OutboxEventPort outboxEventPort;
    private final LoanProjectionSyncService projectionSyncService;

    public ReviewLoanUseCase(
            LoanCommandRepository commandRepository,
            OutboxEventPort outboxEventPort,
            LoanProjectionSyncService projectionSyncService) {
        this.commandRepository = commandRepository;
        this.outboxEventPort = outboxEventPort;
        this.projectionSyncService = projectionSyncService;
    }

    @Transactional
    public Loan execute(String loanId, String decision, String officerId, String justification) {
        Loan loan = commandRepository.findById(loanId)
                .orElseThrow(() -> new LoanNotFoundException(loanId));
        LoanStatus previousStatus = loan.getStatus();

        if ("MANUALLY_APPROVED".equalsIgnoreCase(decision) || "APPROVED".equalsIgnoreCase(decision)) {
            loan.approveManually(officerId, justification);
        } else if ("REJECTED".equalsIgnoreCase(decision) || "MANUALLY_REJECTED".equalsIgnoreCase(decision)) {
            loan.reject(justification);
        } else {
            throw new IllegalArgumentException("Decisão manual inválida: " + decision);
        }

        Loan saved = commandRepository.save(loan);

        outboxEventPort.enqueue("Loan", saved.getId(), "loan.reviewed", new LoanStatusChangedEvent(
                saved.getId(),
                saved.getCustomerId(),
                saved.getAmount(),
                previousStatus,
                saved.getStatus(),
                justification,
                saved.getUpdatedAt()
        ));
        projectionSyncService.sync(saved);

        return saved;
    }
}
