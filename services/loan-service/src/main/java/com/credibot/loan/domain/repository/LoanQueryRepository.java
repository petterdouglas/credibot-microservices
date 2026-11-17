package com.credibot.loan.domain.repository;

import java.util.List;
import java.util.Optional;

import com.credibot.loan.domain.model.Loan;
import com.credibot.loan.domain.model.LoanStatus;

public interface LoanQueryRepository {
    Optional<Loan> findById(String loanId);
    List<Loan> findByFilters(String customerId, LoanStatus status, int page, int size);
    long countByFilters(String customerId, LoanStatus status);
}
