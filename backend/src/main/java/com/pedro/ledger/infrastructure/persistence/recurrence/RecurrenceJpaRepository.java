package com.pedro.ledger.infrastructure.persistence.recurrence;

import com.pedro.ledger.domain.recurrence.RecurrenceStatus;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * JPA repository for recurrence rules.
 */
public interface RecurrenceJpaRepository
    extends JpaRepository<RecurrenceEntity, UUID> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select recurrence from RecurrenceEntity recurrence "
      + "where recurrence.id = :id")
  Optional<RecurrenceEntity> findByIdForUpdate(@Param("id") UUID id);

  @Query("""
      select recurrence.id
      from RecurrenceEntity recurrence
      where recurrence.status = :status
        and recurrence.nextOccurrence <= :date
      order by recurrence.nextOccurrence asc
      """)
  List<UUID> findDueIds(
      @Param("status") RecurrenceStatus status,
      @Param("date") LocalDate date
  );
}
