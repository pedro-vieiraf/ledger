package com.pedro.ledger.domain.transaction;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.money.Money;

/**
 * Processes financial transactions and applies their effects to accounts.
 */
public final class TransactionProcessor {

  private TransactionProcessor() {
  }

  /**
   * Processes an income or expense transaction against an account.
   *
   * @param transaction transaction to process
   * @param account account affected by the transaction
   * @throws IllegalArgumentException if the transaction or account is invalid,
   *     if the account does not match the transaction, or if the transaction
   *     is a transfer
   * @throws IllegalStateException if the account is inactive
   */
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
      default -> throw new IllegalArgumentException(
          "Unsupported transaction type"
      );
    }
  }

  /**
   * Processes a transfer between two accounts.
   *
   * @param transaction transfer transaction to process
   * @param source source account
   * @param destination destination account
   * @throws IllegalArgumentException if the transaction, source, or
   *     destination is invalid or does not match the transaction
   * @throws IllegalStateException if the source or destination account is
   *     inactive
   */
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

  /**
   * Changes the amount of a non-transfer transaction and adjusts the account
   * balance by the corresponding difference.
   *
   * @param transaction transaction whose amount will be changed
   * @param newAmount new transaction amount
   * @param account account affected by the amount adjustment
   * @throws IllegalArgumentException if the transaction, account, or new
   *     amount is invalid, if the account does not match the transaction, or
   *     if the transaction is a transfer
   * @throws IllegalStateException if the transaction was imported through
   *     Open Finance
   */
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

  /**
   * Adjusts an account balance after an expense amount changes.
   *
   * @param account account affected by the adjustment
   * @param difference difference between the new and old amounts
   */
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

  /**
   * Adjusts an account balance after an income amount changes.
   *
   * @param account account affected by the adjustment
   * @param difference difference between the new and old amounts
   */
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

  /**
   * Validates a transaction.
   *
   * @param transaction transaction to validate
   * @throws IllegalArgumentException if the transaction is null
   */
  private static void validateTransaction(
      Transaction transaction
  ) {
    if (transaction == null) {
      throw new IllegalArgumentException(
          "Transaction cannot be null"
      );
    }
  }

  /**
   * Validates an account.
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
   * Ensures that the account matches the account associated with a
   * transaction.
   *
   * @param transaction transaction to validate
   * @param account account to compare with the transaction
   * @throws IllegalArgumentException if the account does not match the
   *     transaction
   */
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