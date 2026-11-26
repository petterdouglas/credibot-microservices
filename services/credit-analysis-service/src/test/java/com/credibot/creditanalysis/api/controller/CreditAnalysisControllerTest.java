package com.credibot.creditanalysis.api.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.credibot.creditanalysis.api.exception.GlobalExceptionHandler;
import com.credibot.creditanalysis.api.mapper.CreditAuditMapper;
import com.credibot.creditanalysis.application.usecase.GetCreditAuditUseCase;
import com.credibot.creditanalysis.domain.exception.CreditAnalysisNotFoundException;
import com.credibot.creditanalysis.domain.model.CreditAnalysis;
import com.credibot.creditanalysis.domain.score.CreditScoreEngine;

@WebMvcTest(CreditAnalysisController.class)
@Import({CreditAuditMapper.class, GlobalExceptionHandler.class})
class CreditAnalysisControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GetCreditAuditUseCase getCreditAuditUseCase;

    @Test
    void shouldReturnCreditAuditByLoanId() throws Exception {
        CreditAnalysis analysis = new CreditScoreEngine()
                .analyze("L-9988", "C-1122", new BigDecimal("500.00"), 6);
        when(getCreditAuditUseCase.execute("L-9988")).thenReturn(analysis);

        mockMvc.perform(get("/api/v1/credit/L-9988"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loanId").value("L-9988"))
                .andExpect(jsonPath("$.score").value(100))
                .andExpect(jsonPath("$.decision").value("APPROVED"))
                .andExpect(jsonPath("$.modelVersion").value("v2.1"))
                .andExpect(jsonPath("$.factors").isArray())
                .andExpect(jsonPath("$.evaluatedAt").exists());
    }

    @Test
    void shouldReturn404Rfc7807WhenAuditNotFound() throws Exception {
        when(getCreditAuditUseCase.execute("L-404"))
                .thenThrow(new CreditAnalysisNotFoundException("L-404"));

        mockMvc.perform(get("/api/v1/credit/L-404"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.title").value("Resource Not Found"))
                .andExpect(jsonPath("$.timestamp").exists());
    }
}
