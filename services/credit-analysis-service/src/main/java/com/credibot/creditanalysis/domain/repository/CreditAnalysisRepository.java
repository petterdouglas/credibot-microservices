package com.credibot.creditanalysis.domain.repository;

import java.util.Optional;

import com.credibot.creditanalysis.domain.model.CreditAnalysis;

public interface CreditAnalysisRepository {

    CreditAnalysis save(CreditAnalysis analysis);

    Optional<CreditAnalysis> findByLoanId(String loanId);
}
