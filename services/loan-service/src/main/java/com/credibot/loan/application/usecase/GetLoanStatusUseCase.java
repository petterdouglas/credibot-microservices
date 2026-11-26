package com.credibot.loan.application.usecase;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.credibot.loan.domain.exception.LoanNotFoundException;
import com.credibot.loan.domain.model.Loan;
import com.credibot.loan.domain.repository.LoanQueryRepository;

@Service
public class GetLoanStatusUseCase {

    private final LoanQueryRepository queryRepository;

    public GetLoanStatusUseCase(LoanQueryRepository queryRepository) {
        this.queryRepository = queryRepository;
    }

    @Transactional(readOnly = true)
    public Loan execute(String loanId) {
        return queryRepository.findById(loanId)
                .orElseThrow(() -> new LoanNotFoundException(loanId));
    }
}
