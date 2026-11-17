package com.pedro.ledger.domain.recurrence;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.domain.transaction.TransactionProcessor;
import com.pedro.ledger.domain.transaction.TransactionSource;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

/**
 * Processes recurring transactions and applies them to their accounts.
 */
public final class RecurrenceProcessor {

  private RecurrenceProcessor() {
  }

  /**
   * Processes a due recurrence and creates the corresponding transaction.
   *
   * @param recurrence recurrence to process
   * @param account account associated with the recurrence
   * @param timestamp timestamp at which the transaction is processed
   * @return the transaction created from the recurrence
   * @throws IllegalArgumentException if the recurrence, account, or timestamp
   *     is null
   * @throws IllegalStateException if the recurrence is inactive or not due yet
   */
  public static Transaction process(
      Recurrence recurrence,
      Account account,
      Instant timestamp
  ) {
    validateRecurrence(recurrence);
    validateAccount(account);
    validateTimestamp(timestamp);

    ensureActive(recurrence);
    ensureDue(recurrence, timestamp);

    return createAndApply(
        recurrence,
        account,
        timestamp,
        UUID.randomUUID(),
        null
    );
  }

  /**
   * Processes a recurrence occurrence that is due on or before the provided
   * date and links the generated transaction to the recurrence occurrence.
   *
   * <p>This overload is used by the scheduler so date comparisons are made in
   * the application's configured time zone instead of relying on UTC.
   *
   * @param recurrence recurrence to process
   * @param account account associated with the recurrence
   * @param timestamp timestamp assigned to the generated transaction
   * @param dueDate latest date the occurrence may represent
   * @param transactionId deterministic transaction identifier
   * @param recurrenceId recurrence identifier
   * @return the transaction created from the recurrence
   */
  public static Transaction process(
      Recurrence recurrence,
      Account account,
      Instant timestamp,
      LocalDate dueDate,
      UUID transactionId,
      UUID recurrenceId
  ) {
    validateRecurrence(recurrence);
    validateAccount(account);
    validateTimestamp(timestamp);
    validateDueDate(dueDate);

    if (transactionId == null) {
      throw new IllegalArgumentException(
          "Transaction ID cannot be null"
      );
    }

    if (recurrenceId == null) {
      throw new IllegalArgumentException(
          "Recurrence ID cannot be null"
      );
    }

    ensureActive(recurrence);
    ensureDueOnOrBefore(recurrence, dueDate);

    return createAndApply(
        recurrence,
        account,
        timestamp,
        transactionId,
        recurrenceId
    );
  }

  private static Transaction createAndApply(
      Recurrence recurrence,
      Account account,
      Instant timestamp,
      UUID transactionId,
      UUID recurrenceId
  ) {
    LocalDate occurrenceDate = recurrence.getNextOccurrence();

    Transaction transaction = recurrenceId == null
        ? Transaction.create(
            recurrence.getAmount(),
            recurrence.getType(),
            recurrence.getDescription(),
            timestamp,
            TransactionSource.MANUAL,
            recurrence.getAccountId(),
            null,
            recurrence.getCategoryId()
        )
        : Transaction.createRecurring(
            transactionId,
            recurrence.getAmount(),
            recurrence.getType(),
            recurrence.getDescription(),
            timestamp,
            TransactionSource.MANUAL,
            recurrence.getAccountId(),
            null,
            recurrence.getCategoryId(),
            recurrenceId,
            occurrenceDate
        );

    TransactionProcessor.process(
        transaction,
        account
    );

    recurrence.advanceToNextOccurrence();

    return transaction;
  }

  /**
   * Ensures that the recurrence is active.
   *
   * @param recurrence recurrence to validate
   * @throws IllegalStateException if the recurrence is inactive
   */
  private static void ensureActive(
      Recurrence recurrence
  ) {
    if (recurrence.getStatus() == RecurrenceStatus.INACTIVE) {
      throw new IllegalStateException(
          "Recurrence is inactive"
      );
    }
  }

  /**
   * Ensures that the recurrence is due for processing.
   *
   * @param recurrence recurrence to validate
   * @param timestamp timestamp used to determine whether the recurrence is due
   * @throws IllegalStateException if the recurrence is not due yet
   */
  private static void ensureDue(
      Recurrence recurrence,
      Instant timestamp
  ) {
    if (recurrence.getNextOccurrence()
        .atStartOfDay()
        .toInstant(ZoneOffset.UTC)
        .isAfter(timestamp)) {

      throw new IllegalStateException(
          "Recurrence is not due yet"
      );
    }
  }

  /**
   * Ensures that the recurrence next occurrence is not after the due date.
   *
   * @param recurrence recurrence to validate
   * @param dueDate latest date considered due
   * @throws IllegalStateException if the recurrence is not due yet
   */
  private static void ensureDueOnOrBefore(
      Recurrence recurrence,
      LocalDate dueDate
  ) {
    if (recurrence.getNextOccurrence().isAfter(dueDate)) {
      throw new IllegalStateException(
          "Recurrence is not due yet"
      );
    }
  }

  /**
   * Validates the due date.
   *
   * @param dueDate due date to validate
   * @throws IllegalArgumentException if the due date is null
   */
  private static void validateDueDate(LocalDate dueDate) {
    if (dueDate == null) {
      throw new IllegalArgumentException(
          "Due date cannot be null"
      );
    }
  }

  /**
   * Validates the recurrence.
   *
   * @param recurrence recurrence to validate
   * @throws IllegalArgumentException if the recurrence is null
   */
  private static void validateRecurrence(
      Recurrence recurrence
  ) {
    if (recurrence == null) {
      throw new IllegalArgumentException(
          "Recurrence cannot be null"
      );
    }
  }

  /**
   * Validates the account.
   *
   * @param account account to validate
   * @throws IllegalArgumentException if the account is null
   */
  private static void validateAccount(
      Account account
  ) {
    if (account == null) {
      throw new IllegalArgumentException(
          "Account cannot be null"
      );
    }
  }

  /**
   * Validates the transaction timestamp.
   *
   * @param timestamp timestamp to validate
   * @throws IllegalArgumentException if the timestamp is null
   */
  private static void validateTimestamp(
      Instant timestamp
  ) {
    if (timestamp == null) {
      throw new IllegalArgumentException(
          "Transaction timestamp cannot be null"
      );
    }
  }
}