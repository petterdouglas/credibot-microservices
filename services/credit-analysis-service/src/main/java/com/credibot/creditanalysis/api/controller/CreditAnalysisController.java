package com.credibot.creditanalysis.api.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.credibot.creditanalysis.api.dto.CreditAuditResponse;
import com.credibot.creditanalysis.api.mapper.CreditAuditMapper;
import com.credibot.creditanalysis.application.usecase.GetCreditAuditUseCase;
import com.credibot.creditanalysis.domain.model.CreditAnalysis;

@RestController
@RequestMapping("/api/v1/credit")
public class CreditAnalysisController {

    private final GetCreditAuditUseCase getCreditAuditUseCase;
    private final CreditAuditMapper mapper;

    public CreditAnalysisController(GetCreditAuditUseCase getCreditAuditUseCase, CreditAuditMapper mapper) {
        this.getCreditAuditUseCase = getCreditAuditUseCase;
        this.mapper = mapper;
    }

    @GetMapping("/{id}")
    public ResponseEntity<CreditAuditResponse> getCreditAudit(@PathVariable String id) {
        CreditAnalysis analysis = getCreditAuditUseCase.execute(id);
        return ResponseEntity.ok(mapper.toResponse(analysis));
    }
}
