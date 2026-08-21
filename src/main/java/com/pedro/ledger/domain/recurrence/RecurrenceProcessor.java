package com.pedro.ledger.domain.recurrence;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.domain.transaction.TransactionProcessor;
import com.pedro.ledger.domain.transaction.TransactionSource;
import java.time.Instant;
import java.time.ZoneOffset;

public final class RecurrenceProcessor {

  private RecurrenceProcessor() {
  }

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

  private static void ensureActive(
      Recurrence recurrence
  ) {
    if (recurrence.getStatus() == RecurrenceStatus.INACTIVE) {
      throw new IllegalStateException(
          "Recurrence is inactive"
      );
    }
  }

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

  private static void validateRecurrence(
      Recurrence recurrence
  ) {
    if (recurrence == null) {
      throw new IllegalArgumentException(
          "Recurrence cannot be null"
      );
    }
  }

  private static void validateAccount(
      Account account
  ) {
    if (account == null) {
      throw new IllegalArgumentException(
          "Account cannot be null"
      );
    }
  }

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