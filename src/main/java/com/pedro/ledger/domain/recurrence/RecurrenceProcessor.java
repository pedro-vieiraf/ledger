package com.pedro.ledger.domain.recurrence;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.domain.transaction.TransactionProcessor;
import com.pedro.ledger.domain.transaction.TransactionSource;
import java.time.Instant;
import java.time.ZoneOffset;

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

    Transaction transaction = Transaction.create(
        recurrence.getAmount(),
        recurrence.getType(),
        recurrence.getDescription(),
        timestamp,
        TransactionSource.MANUAL,
        recurrence.getAccountId(),
        null,
        recurrence.getCategoryId()
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