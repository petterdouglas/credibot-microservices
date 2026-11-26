package com.credibot.customer.domain.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "wallets")
public class Wallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_id", nullable = false, unique = true, length = 50)
    private String customerId;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(nullable = false, length = 3)
    private String currency = "BRL";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Wallet() {}

    public Wallet(String customerId) {
        this.customerId = customerId;
        this.balance = BigDecimal.ZERO;
        this.currency = "BRL";
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    // Getters
    public Long getId() { return id; }
    public String getCustomerId() { return customerId; }
    public BigDecimal getBalance() { return balance; }
    public String getCurrency() { return currency; }

    // Setters
    public void setBalance(BigDecimal balance) { this.balance = balance; this.updatedAt = Instant.now(); }
}
