package com.credibot.creditanalysis.application.usecase;

import org.springframework.stereotype.Service;

import com.credibot.creditanalysis.domain.exception.CreditAnalysisNotFoundException;
import com.credibot.creditanalysis.domain.model.CreditAnalysis;
import com.credibot.creditanalysis.domain.repository.CreditAnalysisRepository;

@Service
public class GetCreditAuditUseCase {

    private final CreditAnalysisRepository repository;

    public GetCreditAuditUseCase(CreditAnalysisRepository repository) {
        this.repository = repository;
    }

    public CreditAnalysis execute(String loanId) {
        return repository.findByLoanId(loanId)
                .orElseThrow(() -> new CreditAnalysisNotFoundException(loanId));
    }
}
