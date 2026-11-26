package com.credibot.loan.application.service;

import org.springframework.stereotype.Service;

import com.credibot.loan.domain.model.Loan;
import com.credibot.loan.domain.repository.LoanQueryRepository;

@Service
public class LoanProjectionSyncService {

    private final LoanQueryRepository queryRepository;

    public LoanProjectionSyncService(LoanQueryRepository queryRepository) {
        this.queryRepository = queryRepository;
    }

    public void sync(Loan loan) {
        queryRepository.save(loan);
    }
}
