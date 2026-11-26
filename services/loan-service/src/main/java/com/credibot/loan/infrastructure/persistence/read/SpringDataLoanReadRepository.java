package com.credibot.loan.infrastructure.persistence.read;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.credibot.loan.domain.model.LoanStatus;

public interface SpringDataLoanReadRepository extends JpaRepository<LoanReadEntity, String> {

    @Query("""
            SELECT l FROM LoanReadEntity l
            WHERE (:customerId IS NULL OR l.customerId = :customerId)
              AND (:status IS NULL OR l.status = :status)
            ORDER BY l.createdAt DESC
            """)
    Page<LoanReadEntity> findByFilters(
            @Param("customerId") String customerId,
            @Param("status") LoanStatus status,
            Pageable pageable);

    @Query("""
            SELECT COUNT(l) FROM LoanReadEntity l
            WHERE (:customerId IS NULL OR l.customerId = :customerId)
              AND (:status IS NULL OR l.status = :status)
            """)
    long countByFilters(
            @Param("customerId") String customerId,
            @Param("status") LoanStatus status);
}
