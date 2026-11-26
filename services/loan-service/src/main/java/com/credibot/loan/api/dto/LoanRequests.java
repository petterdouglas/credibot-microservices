package com.credibot.loan.api.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public final class LoanRequests {

    private LoanRequests() {
    }

    public record CreateLoanRequest(
            @NotBlank(message = "customerId é obrigatório")
            String customerId,

            @NotNull(message = "amount é obrigatório")
            @Positive(message = "amount deve ser positivo")
            BigDecimal amount,

            @NotNull(message = "installments é obrigatório")
            @Min(value = 1, message = "installments deve ser no mínimo 1")
            @Max(value = 48, message = "installments deve ser no máximo 48")
            Integer installments
    ) {}

    public record CancelLoanRequest(
            @NotBlank(message = "reason é obrigatório")
            String reason
    ) {}

    public record ManualReviewRequest(
            @NotBlank(message = "decision é obrigatório")
            String decision,

            @NotBlank(message = "officerId é obrigatório")
            String officerId,

            @NotBlank(message = "justification é obrigatório")
            String justification
    ) {}
}
