package com.credibot.customer.api.exception;

public class CustomerAlreadyExistsException extends RuntimeException {
    public CustomerAlreadyExistsException(String id) {
        super("Cliente com ID '" + id + "' já existe.");
    }
}
