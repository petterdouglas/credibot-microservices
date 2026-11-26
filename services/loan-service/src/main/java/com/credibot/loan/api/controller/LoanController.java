package com.credibot.loan.api.controller;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.credibot.loan.api.dto.LoanRequests.CancelLoanRequest;
import com.credibot.loan.api.dto.LoanRequests.CreateLoanRequest;
import com.credibot.loan.api.dto.LoanRequests.ManualReviewRequest;
import com.credibot.loan.api.dto.LoanResponses.CancelLoanResponse;
import com.credibot.loan.api.dto.LoanResponses.CreateLoanResponse;
import com.credibot.loan.api.dto.LoanResponses.LoanStatusResponse;
import com.credibot.loan.api.dto.LoanResponses.LoanSummaryItem;
import com.credibot.loan.api.dto.LoanResponses.PagedLoanResponse;
import com.credibot.loan.api.dto.LoanResponses.ReviewLoanResponse;
import com.credibot.loan.api.mapper.LoanModelAssembler;
import com.credibot.loan.application.usecase.CancelLoanUseCase;
import com.credibot.loan.application.usecase.CreateLoanUseCase;
import com.credibot.loan.application.usecase.GetLoanStatusUseCase;
import com.credibot.loan.application.usecase.ListLoansUseCase;
import com.credibot.loan.application.usecase.ListLoansUseCase.PagedResult;
import com.credibot.loan.application.usecase.ReviewLoanUseCase;
import com.credibot.loan.domain.model.Loan;
import com.credibot.loan.domain.model.LoanStatus;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/loans")
public class LoanController {

    private final CreateLoanUseCase createLoanUseCase;
    private final GetLoanStatusUseCase getLoanStatusUseCase;
    private final ListLoansUseCase listLoansUseCase;
    private final CancelLoanUseCase cancelLoanUseCase;
    private final ReviewLoanUseCase reviewLoanUseCase;
    private final LoanModelAssembler modelAssembler;

    public LoanController(
            CreateLoanUseCase createLoanUseCase,
            GetLoanStatusUseCase getLoanStatusUseCase,
            ListLoansUseCase listLoansUseCase,
            CancelLoanUseCase cancelLoanUseCase,
            ReviewLoanUseCase reviewLoanUseCase,
            LoanModelAssembler modelAssembler) {
        this.createLoanUseCase = createLoanUseCase;
        this.getLoanStatusUseCase = getLoanStatusUseCase;
        this.listLoansUseCase = listLoansUseCase;
        this.cancelLoanUseCase = cancelLoanUseCase;
        this.reviewLoanUseCase = reviewLoanUseCase;
        this.modelAssembler = modelAssembler;
    }

    @PostMapping
    public ResponseEntity<CreateLoanResponse> createLoan(@Valid @RequestBody CreateLoanRequest request) {
        Loan created = createLoanUseCase.execute(request.customerId(), request.amount(), request.installments());
        CreateLoanResponse body = modelAssembler.toCreateResponse(created);
        return ResponseEntity.created(URI.create("/api/v1/loans/" + created.getId())).body(body);
    }

    @GetMapping("/{id}")
    public ResponseEntity<LoanStatusResponse> getLoanById(@PathVariable String id) {
        Loan loan = getLoanStatusUseCase.execute(id);
        return ResponseEntity.ok(modelAssembler.toStatusResponse(loan));
    }

    @GetMapping
    public ResponseEntity<PagedLoanResponse> listLoans(
            @RequestParam(required = false) String customerId,
            @RequestParam(required = false) LoanStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PagedResult result = listLoansUseCase.execute(customerId, status, page, size);
        List<LoanSummaryItem> items = result.content().stream()
                .map(loan -> new LoanSummaryItem(
                        loan.getId(),
                        loan.getCustomerId(),
                        loan.getAmount(),
                        loan.getStatus(),
                        loan.getCreatedAt()))
                .toList();
        return ResponseEntity.ok(new PagedLoanResponse(
                items,
                result.page(),
                result.size(),
                result.totalElements(),
                result.totalPages()));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<CancelLoanResponse> cancelLoan(
            @PathVariable String id,
            @Valid @RequestBody CancelLoanRequest request) {
        Loan canceled = cancelLoanUseCase.execute(id, request.reason());
        return ResponseEntity.ok(new CancelLoanResponse(
                canceled.getId(),
                canceled.getStatus(),
                canceled.getReason(),
                canceled.getCanceledAt()));
    }

    @PatchMapping("/{id}/review")
    public ResponseEntity<ReviewLoanResponse> reviewLoan(
            @PathVariable String id,
            @Valid @RequestBody ManualReviewRequest request) {
        Loan reviewed = reviewLoanUseCase.execute(
                id,
                request.decision(),
                request.officerId(),
                request.justification());
        return ResponseEntity.ok(new ReviewLoanResponse(
                reviewed.getId(),
                reviewed.getStatus(),
                reviewed.getReviewedBy()));
    }
}
