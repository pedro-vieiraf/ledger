package com.pedro.ledger.domain.transaction;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository {

  Transaction save(Transaction transaction);

  Optional<Transaction> findById(UUID id);

  /**
   * Finds the transaction generated for a recurrence occurrence.
   */
  Optional<Transaction> findByRecurrenceIdAndOccurrenceDate(
      UUID recurrenceId,
      LocalDate occurrenceDate
  );

  List<Transaction> findAll();

  /**
   * Removes the recurrence link from generated transactions, preserving them
   * as ordinary historical transactions.
   */
  void clearRecurrenceLink(UUID recurrenceId);

  void delete(UUID id);

}
