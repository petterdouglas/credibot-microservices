package com.credibot.loan.infrastructure.persistence.write;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SpringDataLoanWriteRepository extends JpaRepository<LoanWriteEntity, String> {
}
