package com.credibot.creditanalysis.infrastructure.persistence;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.credibot.creditanalysis.domain.model.CreditAnalysis;
import com.credibot.creditanalysis.domain.repository.CreditAnalysisRepository;

@Repository
public class CreditAnalysisRepositoryImpl implements CreditAnalysisRepository {

    private final SpringDataCreditAnalysisRepository mongoRepository;

    public CreditAnalysisRepositoryImpl(SpringDataCreditAnalysisRepository mongoRepository) {
        this.mongoRepository = mongoRepository;
    }

    @Override
    public CreditAnalysis save(CreditAnalysis analysis) {
        CreditAnalysisDocument saved = mongoRepository.save(CreditAnalysisDocument.fromDomain(analysis));
        return saved.toDomain();
    }

    @Override
    public Optional<CreditAnalysis> findByLoanId(String loanId) {
        return mongoRepository.findByLoanId(loanId).map(CreditAnalysisDocument::toDomain);
    }
}
