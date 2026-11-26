package com.credibot.loan.api.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.credibot.loan.api.exception.GlobalExceptionHandler;
import com.credibot.loan.api.mapper.LoanModelAssembler;
import com.credibot.loan.application.usecase.CancelLoanUseCase;
import com.credibot.loan.application.usecase.CreateLoanUseCase;
import com.credibot.loan.application.usecase.GetLoanStatusUseCase;
import com.credibot.loan.application.usecase.ListLoansUseCase;
import com.credibot.loan.application.usecase.ListLoansUseCase.PagedResult;
import com.credibot.loan.application.usecase.ReviewLoanUseCase;
import com.credibot.loan.domain.exception.InvalidLoanStateTransitionException;
import com.credibot.loan.domain.exception.LoanNotFoundException;
import com.credibot.loan.domain.model.Loan;
import com.credibot.loan.domain.model.LoanStatus;

@WebMvcTest(LoanController.class)
@Import({LoanModelAssembler.class, GlobalExceptionHandler.class})
class LoanControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CreateLoanUseCase createLoanUseCase;

    @MockitoBean
    private GetLoanStatusUseCase getLoanStatusUseCase;

    @MockitoBean
    private ListLoansUseCase listLoansUseCase;

    @MockitoBean
    private CancelLoanUseCase cancelLoanUseCase;

    @MockitoBean
    private ReviewLoanUseCase reviewLoanUseCase;

    @Test
    void shouldCreateLoanWithHateoasLinks() throws Exception {
        Loan loan = Loan.createProposal("C-1122", new BigDecimal("500.00"), 6);
        when(createLoanUseCase.execute("C-1122", new BigDecimal("500.00"), 6)).thenReturn(loan);

        mockMvc.perform(post("/api/v1/loans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerId": "C-1122",
                                  "amount": 500.00,
                                  "installments": 6
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(loan.getId()))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$._links.self.href").value("/api/v1/loans/" + loan.getId()))
                .andExpect(jsonPath("$._links.cancel.method").value("PATCH"))
                .andExpect(jsonPath("$._links.customer.href").value("/api/v1/customers/C-1122"));
    }

    @Test
    void shouldReturn404Rfc7807WhenLoanNotFound() throws Exception {
        when(getLoanStatusUseCase.execute("L-404")).thenThrow(new LoanNotFoundException("L-404"));

        mockMvc.perform(get("/api/v1/loans/L-404"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Resource Not Found"))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void shouldReturnPagedLoansFromReadModel() throws Exception {
        Loan loan = Loan.createProposal("C-1122", new BigDecimal("500.00"), 6);
        when(listLoansUseCase.execute("C-1122", LoanStatus.PENDING, 0, 10))
                .thenReturn(new PagedResult(List.of(loan), 0, 10, 1, 1));

        mockMvc.perform(get("/api/v1/loans?customerId=C-1122&status=PENDING&page=0&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(loan.getId()))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void shouldReturn422Rfc7807WhenCancelInvalidState() throws Exception {
        when(cancelLoanUseCase.execute(eq("L-1"), any()))
                .thenThrow(new InvalidLoanStateTransitionException(LoanStatus.APPROVED, LoanStatus.CANCELED));

        mockMvc.perform(patch("/api/v1/loans/L-1/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "reason": "Teste" }
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422))
                .andExpect(jsonPath("$.type").value("https://credibot.com.br/errors/unprocessable-entity"));
    }
}
