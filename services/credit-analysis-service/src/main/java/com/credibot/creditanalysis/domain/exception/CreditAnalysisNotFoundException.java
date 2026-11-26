package com.credibot.creditanalysis.domain.exception;

public class CreditAnalysisNotFoundException extends RuntimeException {

    public CreditAnalysisNotFoundException(String loanId) {
        super("Análise de crédito não encontrada para o empréstimo: " + loanId);
    }
}
