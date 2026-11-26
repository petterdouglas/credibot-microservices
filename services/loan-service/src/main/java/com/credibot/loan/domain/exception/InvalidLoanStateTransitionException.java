package com.credibot.loan.domain.exception;

import com.credibot.loan.domain.model.LoanStatus;

public class InvalidLoanStateTransitionException extends RuntimeException {

    public InvalidLoanStateTransitionException(LoanStatus current, LoanStatus target) {
        super("Transição inválida de " + current + " para " + target);
    }
}
