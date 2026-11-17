package com.pedro.ledger.infrastructure.persistence.transaction;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * JPA Repository.
 */
public interface TransactionJpaRepository
    extends JpaRepository<TransactionEntity, UUID> {

  Optional<TransactionEntity> findByRecurrenceIdAndOccurrenceDate(
      UUID recurrenceId,
      LocalDate occurrenceDate
  );

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query("""
      update TransactionEntity transaction
      set transaction.recurrenceId = null,
          transaction.occurrenceDate = null
      where transaction.recurrenceId = :recurrenceId
      """)
  int clearRecurrenceLink(@Param("recurrenceId") UUID recurrenceId);
}
