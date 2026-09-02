package com.pedro.ledger.infrastructure.persistence.transaction;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * JPA Repository.
 */
public interface TransactionJpaRepository
  extends JpaRepository<TransactionEntity, UUID> {

}
