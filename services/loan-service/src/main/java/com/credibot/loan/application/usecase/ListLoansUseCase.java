package com.credibot.loan.application.usecase;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.credibot.loan.domain.model.Loan;
import com.credibot.loan.domain.model.LoanStatus;
import com.credibot.loan.domain.repository.LoanQueryRepository;

@Service
public class ListLoansUseCase {

    private final LoanQueryRepository queryRepository;

    public ListLoansUseCase(LoanQueryRepository queryRepository) {
        this.queryRepository = queryRepository;
    }

    @Transactional(readOnly = true)
    public PagedResult execute(String customerId, LoanStatus status, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        List<Loan> content = queryRepository.findByFilters(customerId, status, safePage, safeSize);
        long totalElements = queryRepository.countByFilters(customerId, status);
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / safeSize);
        return new PagedResult(content, safePage, safeSize, totalElements, totalPages);
    }

    public record PagedResult(
            List<Loan> content,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {}
}
