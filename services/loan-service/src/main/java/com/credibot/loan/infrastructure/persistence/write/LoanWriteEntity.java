package com.credibot.loan.infrastructure.persistence.write;

import java.math.BigDecimal;
import java.time.Instant;

import com.credibot.loan.domain.model.Loan;
import com.credibot.loan.domain.model.LoanStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "loans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LoanWriteEntity {

    @Id
    @Column(length = 50, nullable = false)
    private String id;

    @Column(name = "customer_id", length = 50, nullable = false)
    private String customerId;

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private Integer installments;

    @Enumerated(EnumType.STRING)
    @Column(length = 30, nullable = false)
    private LoanStatus status;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "reviewed_by", length = 50)
    private String reviewedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "canceled_at")
    private Instant canceledAt;

    public static LoanWriteEntity fromDomain(Loan loan) {
        return new LoanWriteEntity(
                loan.getId(),
                loan.getCustomerId(),
                loan.getAmount(),
                loan.getInstallments(),
                loan.getStatus(),
                loan.getReason(),
                loan.getReviewedBy(),
                loan.getCreatedAt(),
                loan.getUpdatedAt(),
                loan.getCanceledAt()
        );
    }

    public Loan toDomain() {
        return Loan.restore(
                this.id,
                this.customerId,
                this.amount,
                this.installments,
                this.status,
                this.reason,
                this.reviewedBy,
                this.createdAt,
                this.updatedAt,
                this.canceledAt
        );
    }
}
