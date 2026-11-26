package com.credibot.loan.api.exception;

import java.net.URI;
import java.time.Instant;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.credibot.loan.domain.exception.InvalidLoanStateTransitionException;
import com.credibot.loan.domain.exception.LoanNotFoundException;

import jakarta.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(LoanNotFoundException.class)
    public ProblemDetail handleNotFound(LoanNotFoundException ex, HttpServletRequest request) {
        return buildProblem(HttpStatus.NOT_FOUND, "not-found", "Resource Not Found", ex.getMessage(), request);
    }

    @ExceptionHandler(InvalidLoanStateTransitionException.class)
    public ProblemDetail handleInvalidTransition(InvalidLoanStateTransitionException ex, HttpServletRequest request) {
        return buildProblem(HttpStatus.UNPROCESSABLE_ENTITY, "unprocessable-entity", "Unprocessable Entity", ex.getMessage(), request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleBadRequest(IllegalArgumentException ex, HttpServletRequest request) {
        return buildProblem(HttpStatus.BAD_REQUEST, "bad-request", "Bad Request", ex.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return buildProblem(HttpStatus.BAD_REQUEST, "validation-error", "Validation Error", detail, request);
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGeneric(Exception ex, HttpServletRequest request) {
        return buildProblem(HttpStatus.INTERNAL_SERVER_ERROR, "internal-error", "Internal Server Error",
                "Erro interno inesperado ao processar a solicitação.", request);
    }

    private ProblemDetail buildProblem(
            HttpStatus status,
            String errorSlug,
            String title,
            String detail,
            HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setType(URI.create("https://credibot.com.br/errors/" + errorSlug));
        problem.setTitle(title);
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }
}
