package com.pedro.ledger.domain.transaction;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.money.Money;

public final class TransactionProcessor {

  private TransactionProcessor() {
  }

  public static void process(
      Transaction transaction,
      Account account
  ) {
    validateTransaction(transaction);
    validateAccount(account);

    ensureAccountMatchesTransaction(transaction, account);

    switch (transaction.getType()) {
      case INCOME -> account.credit(transaction.getAmount());
      case EXPENSE -> account.debit(transaction.getAmount());
      case TRANSFER -> throw new IllegalArgumentException(
          "Transfer requires a destination account"
      );
    }
  }

  public static void process(
      Transaction transaction,
      Account source,
      Account destination
  ) {
    validateTransaction(transaction);
    validateAccount(source);

    if (transaction.getType() != TransactionType.TRANSFER) {
      throw new IllegalArgumentException(
          "Only transfers can have a destination account"
      );
    }

    if (!transaction.getAccountId().equals(source.getId())) {
      throw new IllegalArgumentException(
          "Account does not match transaction"
      );
    }

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

    if (!source.isActive()) {
      throw new IllegalStateException(
          "Account is inactive"
      );
    }

    if (!destination.isActive()) {
      throw new IllegalStateException(
          "Destination account is inactive"
      );
    }

    source.debit(transaction.getAmount());
    destination.credit(transaction.getAmount());
  }

  public static void changeAmount(
      Transaction transaction,
      Money newAmount,
      Account account
  ) {
    validateTransaction(transaction);
    validateAccount(account);

    ensureAccountMatchesTransaction(transaction, account);

    Money oldAmount = transaction.getAmount();

    if (newAmount == null) {
      throw new IllegalArgumentException(
          "Transaction amount cannot be null"
      );
    }

    if (newAmount.isZero() || newAmount.isNegative()) {
      throw new IllegalArgumentException(
          "Transaction amount must be greater than zero"
      );
    }

    if (transaction.getSource() == TransactionSource.OPEN_FINANCE) {
      throw new IllegalStateException(
          "Open Finance transactions cannot have their amount changed"
      );
    }

    if (transaction.getType() == TransactionType.TRANSFER) {
      throw new IllegalArgumentException(
          "Transfer amount changes require both accounts"
      );
    }

    if (oldAmount.equals(newAmount)) {
      return;
    }

    Money difference = newAmount.subtract(oldAmount);

    if (transaction.getType() == TransactionType.EXPENSE) {
      adjustExpenseAmount(account, difference);
    } else {
      adjustIncomeAmount(account, difference);
    }

    transaction.changeAmount(newAmount);
  }

  private static void adjustExpenseAmount(
      Account account,
      Money difference
  ) {
    if (difference.isNegative()) {
      account.credit(difference.multiply(-1));
    } else {
      account.debit(difference);
    }
  }

  private static void adjustIncomeAmount(
      Account account,
      Money difference
  ) {
    if (difference.isNegative()) {
      account.debit(difference.multiply(-1));
    } else {
      account.credit(difference);
    }
  }

  private static void validateTransaction(
      Transaction transaction
  ) {
    if (transaction == null) {
      throw new IllegalArgumentException(
          "Transaction cannot be null"
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

  private static void ensureAccountMatchesTransaction(
      Transaction transaction,
      Account account
  ) {
    if (!transaction.getAccountId()
        .equals(account.getId())) {
      throw new IllegalArgumentException(
          "Account does not match transaction"
      );
    }
  }
}