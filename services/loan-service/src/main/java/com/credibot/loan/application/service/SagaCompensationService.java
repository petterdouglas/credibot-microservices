package com.credibot.loan.application.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.credibot.loan.domain.exception.LoanNotFoundException;
import com.credibot.loan.domain.model.Loan;
import com.credibot.loan.domain.model.LoanStatus;
import com.credibot.loan.domain.repository.LoanCommandRepository;

@Service
public class SagaCompensationService {

    private static final Logger log = LoggerFactory.getLogger(SagaCompensationService.class);

    private final LoanCommandRepository commandRepository;
    private final LoanProjectionSyncService projectionSyncService;

    public SagaCompensationService(
            LoanCommandRepository commandRepository,
            LoanProjectionSyncService projectionSyncService) {
        this.commandRepository = commandRepository;
        this.projectionSyncService = projectionSyncService;
    }

    @Transactional
    public void handleCreditRejected(String loanId, String reason) {
        Loan loan = loadPendingLoanOrIgnore(loanId, "CreditRejectedEvent");
        if (loan == null) {
            return;
        }
        loan.reject(reason);
        Loan saved = commandRepository.save(loan);
        projectionSyncService.sync(saved);
    }

    @Transactional
    public void handleDepositSuccess(String loanId, String transactionId) {
        Loan loan = loadPendingLoanOrIgnore(loanId, "DepositSuccessEvent");
        if (loan == null) {
            return;
        }
        loan.approve();
        Loan saved = commandRepository.save(loan);
        projectionSyncService.sync(saved);
        log.info("SAGA concluída com aprovação para empréstimo {} (tx={})", loanId, transactionId);
    }

    @Transactional
    public void handleDepositFailed(String loanId, String failureReason) {
        Loan loan = loadPendingLoanOrIgnore(loanId, "DepositFailedEvent");
        if (loan == null) {
            return;
        }
        loan.compensateFailure(failureReason);
        Loan saved = commandRepository.save(loan);
        projectionSyncService.sync(saved);
        log.warn("Compensação SAGA executada para empréstimo {}: {}", loanId, failureReason);
    }

    private Loan loadPendingLoanOrIgnore(String loanId, String eventName) {
        Loan loan = commandRepository.findById(loanId)
                .orElseThrow(() -> new LoanNotFoundException(loanId));
        if (loan.getStatus() != LoanStatus.PENDING) {
            log.info("Ignorando {} para empréstimo {} já em estado {}", eventName, loanId, loan.getStatus());
            return null;
        }
        return loan;
    }
}
