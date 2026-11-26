package com.credibot.creditanalysis.api.exception;

import java.net.URI;
import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.credibot.creditanalysis.domain.exception.CreditAnalysisNotFoundException;

import jakarta.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(CreditAnalysisNotFoundException.class)
    public ProblemDetail handleNotFound(CreditAnalysisNotFoundException ex, HttpServletRequest request) {
        return buildProblem(HttpStatus.NOT_FOUND, "not-found", "Resource Not Found", ex.getMessage(), request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleBadRequest(IllegalArgumentException ex, HttpServletRequest request) {
        return buildProblem(HttpStatus.BAD_REQUEST, "bad-request", "Bad Request", ex.getMessage(), request);
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGeneric(Exception ex, HttpServletRequest request) {
        return buildProblem(HttpStatus.INTERNAL_SERVER_ERROR, "internal-error", "Internal Server Error",
                "Erro interno inesperado ao consultar auditoria de crédito.", request);
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
