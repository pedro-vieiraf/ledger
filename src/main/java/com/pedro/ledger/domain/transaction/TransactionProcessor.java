package com.pedro.ledger.domain.transaction;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountStatus;

public final class TransactionProcessor {

  private TransactionProcessor() {
  }

  public static void process(
      Transaction transaction,
      Account account
  ) {
    if (transaction.getType() == TransactionType.TRANSFER) {
      throw new IllegalArgumentException(
          "Transfer transaction requires source and destination accounts"
      );
    }

    validateAccount(transaction, account);

    switch (transaction.getType()) {
      case INCOME -> account.credit(transaction.getAmount());

      case EXPENSE -> account.debit(transaction.getAmount());

      default -> throw new IllegalStateException(
          "Unsupported transaction type"
      );
    }
  }

  public static void process(
      Transaction transaction,
      Account source,
      Account destination
  ) {
    if (transaction.getType() != TransactionType.TRANSFER) {
      throw new IllegalArgumentException(
          "Only transfer transactions can have source and destination accounts"
      );
    }

    validateAccount(transaction, source);
    validateDestination(transaction, destination);

    source.debit(transaction.getAmount());
    destination.credit(transaction.getAmount());
  }

  private static void validateDestination(
      Transaction transaction,
      Account destination
  ) {
    if (destination == null) {
      throw new IllegalArgumentException(
          "Destination account cannot be null"
      );
    }

    if (!transaction.getDestinationAccountId()
        .equals(destination.getId())) {

      throw new IllegalArgumentException(
          "Destination account does not match transaction"
      );
    }

    if (destination.getStatus() == AccountStatus.INACTIVE) {
      throw new IllegalStateException(
          "Destination account is inactive"
      );
    }
  }

  private static void validateAccount(
      Transaction transaction,
      Account account
  ) {
    if (account == null) {
      throw new IllegalArgumentException(
          "Account cannot be null"
      );
    }

    if (!transaction.getAccountId().equals(account.getId())) {
      throw new IllegalArgumentException(
          "Account does not match transaction"
      );
    }
  }
}