package com.credibot.customer.domain.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "customers")
public class Customer {

    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 200)
    private String email;

    @Column(length = 14)
    private String cpf;

    @Column(name = "monthly_income", precision = 15, scale = 2)
    private BigDecimal monthlyIncome;

    @Column(name = "kyc_status", nullable = false, length = 30)
    private String kycStatus = "PENDING";

    @Column(name = "account_blocked", nullable = false)
    private boolean accountBlocked = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Customer() {}

    public Customer(String id, String name, String email) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    // Getters
    public String getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getCpf() { return cpf; }
    public BigDecimal getMonthlyIncome() { return monthlyIncome; }
    public String getKycStatus() { return kycStatus; }
    public boolean isAccountBlocked() { return accountBlocked; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    // Setters
    public void setName(String name) { this.name = name; this.updatedAt = Instant.now(); }
    public void setEmail(String email) { this.email = email; this.updatedAt = Instant.now(); }
    public void setCpf(String cpf) { this.cpf = cpf; this.updatedAt = Instant.now(); }
    public void setMonthlyIncome(BigDecimal monthlyIncome) { this.monthlyIncome = monthlyIncome; this.updatedAt = Instant.now(); }
    public void setKycStatus(String kycStatus) { this.kycStatus = kycStatus; this.updatedAt = Instant.now(); }
    public void setAccountBlocked(boolean accountBlocked) { this.accountBlocked = accountBlocked; this.updatedAt = Instant.now(); }
}
