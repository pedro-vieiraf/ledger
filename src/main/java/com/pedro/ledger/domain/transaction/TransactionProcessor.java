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

    if (!account.isActive()) {
      throw new IllegalStateException(
          "Account is inactive"
      );
    }

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
    ensureAccountMatchesTransaction(transaction, source);

    if (transaction.getType() != TransactionType.TRANSFER) {
      throw new IllegalArgumentException(
          "Only transfers can have a destination account"
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

    if (!account.isActive()) {
      throw new IllegalStateException("Account is inactive");
    }
    if (transaction.getType() == TransactionType.TRANSFER) {
      throw new IllegalArgumentException("Transfer amount changes require both accounts");
    }

    Money oldAmount = transaction.getAmount();
    if (oldAmount.equals(newAmount)) {
      return;
    }

    transaction.changeAmount(newAmount);

    Money difference = newAmount.subtract(oldAmount);

    if (transaction.getType() == TransactionType.EXPENSE) {
      adjustExpenseAmount(account, difference);
    } else {
      adjustIncomeAmount(account, difference);
    }
  }

  private static void adjustExpenseAmount(
      Account account,
      Money difference
  ) {
    if (difference.isNegative()) {
      account.credit(difference.negate());
    } else {
      account.debit(difference);
    }
  }

  private static void adjustIncomeAmount(
      Account account,
      Money difference
  ) {
    if (difference.isNegative()) {
      account.debit(difference.negate());
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