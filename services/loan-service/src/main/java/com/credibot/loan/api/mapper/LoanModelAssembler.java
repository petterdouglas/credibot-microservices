package com.credibot.loan.api.mapper;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.credibot.loan.api.dto.HateoasLink;
import com.credibot.loan.api.dto.LoanResponses.CreateLoanResponse;
import com.credibot.loan.api.dto.LoanResponses.LoanStatusResponse;
import com.credibot.loan.domain.model.Loan;
import com.credibot.loan.domain.model.LoanStatus;

@Component
public class LoanModelAssembler {

    public CreateLoanResponse toCreateResponse(Loan loan) {
        Map<String, HateoasLink> links = new LinkedHashMap<>();
        links.put("self", new HateoasLink("/api/v1/loans/" + loan.getId(), "GET"));
        links.put("cancel", new HateoasLink("/api/v1/loans/" + loan.getId() + "/cancel", "PATCH"));
        links.put("customer", new HateoasLink("/api/v1/customers/" + loan.getCustomerId(), "GET"));

        return new CreateLoanResponse(
                loan.getId(),
                loan.getCustomerId(),
                loan.getAmount(),
                loan.getInstallments(),
                loan.getStatus(),
                loan.getCreatedAt(),
                links
        );
    }

    public LoanStatusResponse toStatusResponse(Loan loan) {
        Map<String, HateoasLink> links = new LinkedHashMap<>();
        links.put("self", new HateoasLink("/api/v1/loans/" + loan.getId(), "GET"));
        if (loan.getStatus() == LoanStatus.PENDING) {
            links.put("cancel", new HateoasLink("/api/v1/loans/" + loan.getId() + "/cancel", "PATCH"));
            links.put("customer", new HateoasLink("/api/v1/customers/" + loan.getCustomerId(), "GET"));
        } else if (loan.getStatus() == LoanStatus.APPROVED) {
            links.put("wallet", new HateoasLink("/api/v1/customers/" + loan.getCustomerId() + "/wallet", "GET"));
        }

        return new LoanStatusResponse(
                loan.getId(),
                loan.getCustomerId(),
                loan.getAmount(),
                loan.getStatus(),
                loan.getUpdatedAt(),
                links
        );
    }
}
