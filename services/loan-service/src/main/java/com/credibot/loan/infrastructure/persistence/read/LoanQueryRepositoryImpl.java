package com.credibot.loan.infrastructure.persistence.read;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

import com.credibot.loan.domain.model.Loan;
import com.credibot.loan.domain.model.LoanStatus;
import com.credibot.loan.domain.repository.LoanQueryRepository;

@Repository
public class LoanQueryRepositoryImpl implements LoanQueryRepository {

    private final SpringDataLoanReadRepository jpaRepository;

    public LoanQueryRepositoryImpl(SpringDataLoanReadRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public void save(Loan loan) {
        jpaRepository.save(LoanReadEntity.fromDomain(loan));
    }

    @Override
    public Optional<Loan> findById(String loanId) {
        return jpaRepository.findById(loanId).map(LoanReadEntity::toDomain);
    }

    @Override
    public List<Loan> findByFilters(String customerId, LoanStatus status, int page, int size) {
        String normalizedCustomerId = (customerId == null || customerId.isBlank()) ? null : customerId;
        return jpaRepository.findByFilters(normalizedCustomerId, status, PageRequest.of(page, size))
                .getContent()
                .stream()
                .map(LoanReadEntity::toDomain)
                .toList();
    }

    @Override
    public long countByFilters(String customerId, LoanStatus status) {
        String normalizedCustomerId = (customerId == null || customerId.isBlank()) ? null : customerId;
        return jpaRepository.countByFilters(normalizedCustomerId, status);
    }
}
