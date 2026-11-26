package com.credibot.loan.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.credibot.loan.domain.model.LoanStatus;
import com.fasterxml.jackson.annotation.JsonProperty;

public final class LoanResponses {

    private LoanResponses() {
    }

    public record CreateLoanResponse(
            String id,
            String customerId,
            BigDecimal amount,
            Integer installments,
            LoanStatus status,
            Instant createdAt,
            @JsonProperty("_links") Map<String, HateoasLink> links
    ) {}

    public record LoanStatusResponse(
            String id,
            String customerId,
            BigDecimal amount,
            LoanStatus status,
            Instant updatedAt,
            @JsonProperty("_links") Map<String, HateoasLink> links
    ) {}

    public record LoanSummaryItem(
            String id,
            String customerId,
            BigDecimal amount,
            LoanStatus status,
            Instant createdAt
    ) {}

    public record PagedLoanResponse(
            List<LoanSummaryItem> content,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {}

    public record CancelLoanResponse(
            String id,
            LoanStatus status,
            String reason,
            Instant canceledAt
    ) {}

    public record ReviewLoanResponse(
            String loanId,
            LoanStatus status,
            String reviewedBy
    ) {}
}
