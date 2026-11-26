package com.credibot.customer.api.dto;

import java.math.BigDecimal;

public class CustomerDtos {

    // Response: GET /api/v1/customers/{id}
    public record CustomerProfileResponse(
            String id,
            String name,
            String email,
            String cpf,
            BigDecimal monthlyIncome,
            String kycStatus,
            boolean accountBlocked
    ) {}

    // Response: GET /api/v1/customers/{id}/wallet
    public record WalletResponse(
            String customerId,
            BigDecimal balance,
            String currency
    ) {}

    // Request: POST /api/v1/customers
    public record CreateCustomerRequest(
            String id,
            String name,
            String email,
            String cpf,
            BigDecimal monthlyIncome
    ) {}
}
