package com.credibot.customer.api.exception;

public class CustomerNotFoundException extends RuntimeException {
    public CustomerNotFoundException(String id) {
        super("Cliente não encontrado: " + id);
    }
}
