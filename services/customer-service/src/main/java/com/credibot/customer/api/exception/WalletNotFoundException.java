package com.credibot.customer.api.exception;

public class WalletNotFoundException extends RuntimeException {
    public WalletNotFoundException(String customerId) {
        super("Carteira não encontrada para o cliente: " + customerId);
    }
}
