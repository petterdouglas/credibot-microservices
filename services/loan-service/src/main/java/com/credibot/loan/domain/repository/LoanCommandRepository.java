package com.credibot.loan.domain.repository;

import java.util.Optional;

import com.credibot.loan.domain.model.Loan;

public interface LoanCommandRepository {
    Loan save(Loan loan);
    Optional<Loan> findById(String loanId);
}
