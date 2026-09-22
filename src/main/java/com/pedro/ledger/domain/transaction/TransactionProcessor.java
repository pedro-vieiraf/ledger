package com.pedro.ledger.domain.transaction;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountInactiveException;
import com.pedro.ledger.domain.money.CurrencyMismatchException;
import com.pedro.ledger.domain.money.Money;

/**
 * Processes financial transactions and applies their effects to accounts.
 *
 * <p>This class contains domain logic responsible for applying, adjusting,
 * and reversing the financial effects of transactions. It does not perform
 * persistence or application-level orchestration.
 */
public final class TransactionProcessor {

  private TransactionProcessor() {
  }

  /**
   * Processes an income or expense transaction against an account.
   *
   * <p>An income increases the account balance, while an expense decreases
   * it. Transfer transactions must be processed using the overload that
   * receives both source and destination accounts.
   *
   * @param transaction transaction to process
   * @param account account affected by the transaction
   * @throws IllegalArgumentException if the transaction or account is null,
   *     if the account does not match the transaction, or if the transaction
   *     is a transfer
   * @throws AccountInactiveException if the account is inactive
   */
  public static void process(
      Transaction transaction,
      Account account
  ) {
    validateTransaction(transaction);
    validateAccount(account);

    ensureAccountMatchesTransaction(transaction, account);

    if (!account.isActive()) {
      throw new AccountInactiveException(
          "Account is inactive"
      );
    }

    ensureSameCurrency(
        transaction.getAmount(),
        account.getBalance()
    );

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
   * <p>The transaction's source account is debited and its destination
   * account is credited by the transaction amount.
   *
   * @param transaction transfer transaction to process
   * @param source source account
   * @param destination destination account
   * @throws IllegalArgumentException if the transaction or source is null,
   *     if the destination is null, if either account does not match the
   *     transaction, or if the transaction is not a transfer
   * @throws AccountInactiveException if the source or destination account
   *     is inactive
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
      throw new AccountInactiveException(
          "Account is inactive"
      );
    }

    if (!destination.isActive()) {
      throw new AccountInactiveException(
          "Destination account is inactive"
      );
    }

    ensureSameCurrency(
        transaction.getAmount(),
        destination.getBalance()
    );

    source.debit(transaction.getAmount());
    destination.credit(transaction.getAmount());
  }

  /**
   * Changes the amount of a non-transfer transaction and adjusts the
   * affected account balance by the corresponding difference.
   *
   * <p>For an expense, increasing the amount decreases the account balance,
   * while decreasing the amount restores the corresponding difference.
   * For an income, the inverse operation is performed.
   *
   * <p>Transactions imported through Open Finance are not allowed to have
   * their amounts changed. That rule is enforced by the transaction itself.
   *
   * @param transaction transaction whose amount will be changed
   * @param newAmount new transaction amount
   * @param account account affected by the amount adjustment
   * @throws IllegalArgumentException if the transaction, account, or new
   *     amount is invalid, if the account does not match the transaction,
   *     or if the transaction is a transfer
   * @throws AccountInactiveException if the account is inactive
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
      throw new AccountInactiveException("Account is inactive");
    }

    if (transaction.getType() == TransactionType.TRANSFER) {
      throw new IllegalArgumentException(
          "Transfer amount changes require both accounts"
      );
    }

    Money oldAmount = transaction.getAmount();

    if (oldAmount.equals(newAmount)) {
      return;
    }

    ensureSameCurrency(newAmount, oldAmount);

    Money difference = newAmount.subtract(oldAmount);

    transaction.changeAmount(newAmount);

    if (transaction.getType() == TransactionType.EXPENSE) {
      adjustExpenseAmount(account, difference);
    } else {
      adjustIncomeAmount(account, difference);
    }
  }

  /**
   * Reverses the financial effect of an income or expense transaction.
   *
   * <p>Reversing an expense credits the transaction amount back to the
   * account. Reversing an income debits the transaction amount from the
   * account.
   *
   * <p>The transaction is marked as reversed after its financial effect
   * is successfully applied.
   *
   * <p>Transfer transactions must be reversed using the overload that
   * receives both source and destination accounts.
   *
   * @param transaction transaction whose financial effect will be reversed
   * @param account account affected by the transaction
   * @throws IllegalArgumentException if the transaction or account is null,
   *     if the account does not match the transaction, or if the transaction
   *     is a transfer
   * @throws AccountInactiveException if the account is inactive
   * @throws CurrencyMismatchException if the transaction and account use
   *     different currencies
   * @throws IllegalStateException if the transaction is already reversed
   */
  public static void reverse(
      Transaction transaction,
      Account account
  ) {
    validateTransaction(transaction);
    validateAccount(account);

    ensureAccountMatchesTransaction(transaction, account);

    if (!account.isActive()) {
      throw new AccountInactiveException(
          "Account is inactive"
      );
    }

    if (transaction.getStatus() == TransactionStatus.REVERSED) {
      throw new IllegalStateException(
          "Transaction is already reversed"
      );
    }

    if (transaction.getType() == TransactionType.TRANSFER) {
      throw new IllegalArgumentException(
          "Transfer requires source and destination accounts"
      );
    }

    ensureSameCurrency(
        transaction.getAmount(),
        account.getBalance()
    );

    switch (transaction.getType()) {
      case EXPENSE -> account.credit(transaction.getAmount());
      case INCOME -> account.debit(transaction.getAmount());
      default -> throw new IllegalArgumentException(
          "Unsupported transaction type"
      );
    }

    transaction.reverse();
  }

  /**
   * Reverses the financial effect of a transfer between two accounts.
   *
   * <p>The original source account is credited and the original destination
   * account is debited by the transaction amount. The transaction is marked
   * as reversed after both financial effects are successfully applied.
   *
   * @param transaction transfer transaction whose financial effect will be
   *     reversed
   * @param source source account of the original transfer
   * @param destination destination account of the original transfer
   * @throws IllegalArgumentException if the transaction, source, or
   *     destination is null, if the source or destination does not match
   *     the transaction, or if the transaction is not a transfer
   * @throws AccountInactiveException if the source or destination account
   *     is inactive
   * @throws CurrencyMismatchException if the transaction, source, and
   *     destination currencies do not match
   * @throws IllegalStateException if the transaction is already reversed
   */
  public static void reverse(
      Transaction transaction,
      Account source,
      Account destination
  ) {
    validateTransaction(transaction);
    validateAccount(source);
    validateAccount(destination);

    if (transaction.getType() != TransactionType.TRANSFER) {
      throw new IllegalArgumentException(
          "Transaction is not a transfer"
      );
    }

    ensureAccountMatchesTransaction(transaction, source);

    if (!destination.getId().equals(
        transaction.getDestinationAccountId()
    )) {
      throw new IllegalArgumentException(
          "Destination account does not match transaction"
      );
    }

    if (!source.isActive()) {
      throw new AccountInactiveException(
          "Account is inactive"
      );
    }

    if (!destination.isActive()) {
      throw new AccountInactiveException(
          "Destination account is inactive"
      );
    }

    if (transaction.getStatus() == TransactionStatus.REVERSED) {
      throw new IllegalStateException(
          "Transaction is already reversed"
      );
    }

    ensureSameCurrency(
        transaction.getAmount(),
        source.getBalance()
    );

    ensureSameCurrency(
        transaction.getAmount(),
        destination.getBalance()
    );

    source.credit(transaction.getAmount());
    destination.debit(transaction.getAmount());

    transaction.reverse();
  }

  /**
   * Adjusts an account balance after an expense amount changes.
   *
   * <p>Increasing the expense decreases the account balance. Decreasing the
   * expense restores the corresponding difference to the account.
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
   * <p>Increasing the income increases the account balance. Decreasing the
   * income removes the corresponding difference from the account.
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
   * Validates that a transaction is not null.
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
   * Validates that an account is not null.
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

  /**
   * Ensures that the transaction amount and account balance use the same
   * currency.
   *
   * @param transactionAmount transaction amount
   * @param accountBalance account balance
   * @throws CurrencyMismatchException if the currencies do not match
   */
  private static void ensureSameCurrency(
      Money transactionAmount,
      Money accountBalance
  ) {
    if (!transactionAmount.currency()
        .equals(accountBalance.currency())) {

      throw new CurrencyMismatchException(
          transactionAmount.currency(),
          accountBalance.currency()
      );
    }
  }
}