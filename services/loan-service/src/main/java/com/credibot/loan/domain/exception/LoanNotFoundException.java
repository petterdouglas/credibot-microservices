package com.credibot.loan.domain.exception;

public class LoanNotFoundException extends RuntimeException {

    public LoanNotFoundException(String loanId) {
        super("Empréstimo não encontrado: " + loanId);
    }
}
