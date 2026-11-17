package com.pedro.ledger.domain.recurrence;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Defines the persistence operations available for recurrences.
 */
public interface RecurrenceRepository {

  Recurrence save(Recurrence recurrence);

  Optional<Recurrence> findById(UUID id);

  /**
   * Loads a recurrence with a write lock so concurrent scheduler instances
   * cannot generate the same occurrence twice.
   */
  Optional<Recurrence> findByIdForUpdate(UUID id);

  List<Recurrence> findAll();

  /**
   * Returns the identifiers of active recurrences due on or before the
   * provided date.
   */
  List<UUID> findDueIds(LocalDate date);

  void delete(UUID id);
}
