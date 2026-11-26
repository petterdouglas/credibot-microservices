package com.credibot.creditanalysis.infrastructure.persistence;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface SpringDataCreditAnalysisRepository extends MongoRepository<CreditAnalysisDocument, String> {

    Optional<CreditAnalysisDocument> findByLoanId(String loanId);
}
