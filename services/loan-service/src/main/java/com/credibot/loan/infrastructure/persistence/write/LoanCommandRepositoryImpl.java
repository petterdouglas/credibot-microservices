package com.credibot.loan.infrastructure.persistence.write;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.credibot.loan.domain.model.Loan;
import com.credibot.loan.domain.repository.LoanCommandRepository;

@Repository
public class LoanCommandRepositoryImpl implements LoanCommandRepository {

    private final SpringDataLoanWriteRepository jpaRepository;

    public LoanCommandRepositoryImpl(SpringDataLoanWriteRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Loan save(Loan loan) {
        LoanWriteEntity saved = jpaRepository.save(LoanWriteEntity.fromDomain(loan));
        return saved.toDomain();
    }

    @Override
    public Optional<Loan> findById(String loanId) {
        return jpaRepository.findById(loanId).map(LoanWriteEntity::toDomain);
    }
}
