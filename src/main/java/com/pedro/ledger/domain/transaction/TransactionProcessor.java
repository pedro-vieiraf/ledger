package com.pedro.ledger.domain.transaction;

import com.pedro.ledger.domain.account.Account;

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

    if (!transaction.getDestinationAccountId()
        .equals(destination.getId())) {

      throw new IllegalArgumentException(
          "Destination account does not match transaction"
      );
    }

    source.debit(transaction.getAmount());
    destination.credit(transaction.getAmount());
  }

  private static void validateAccount(
      Transaction transaction,
      Account account
  ) {
    if (!transaction.getAccountId().equals(account.getId())) {
      throw new IllegalArgumentException(
          "Account does not match transaction"
      );
    }
  }
}