package com.credibot.loan.domain.model;

public enum LoanStatus {
    PENDING,
    APPROVED,
    REJECTED,
    CANCELED,
    CANCELED_DUE_TO_ERROR;

    public boolean canTransitionTo(LoanStatus proxStatus){
        switch(this){
            case PENDING -> {
                if( this == proxStatus || proxStatus == null) return false;
                return true;
            }
            default -> {
                return false;
            }
        }
    }
    
}