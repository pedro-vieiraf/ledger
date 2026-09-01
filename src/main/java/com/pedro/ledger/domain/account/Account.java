package com.pedro.ledger.domain.account;

import com.pedro.ledger.domain.money.Money;
import java.util.UUID;

/**
 * Represents a bank account within the Ledger.
 */
public class Account {

  private final UUID id;
  private String name;
  private AccountType type;

  private AccountStatus status;
  private Money balance;

  /**
   * Creates an account with the given data.
   *
   * @param id account identifier
   * @param name account name
   * @param type account type
   * @param status account status
   * @param balance account balance
   */
  private Account(
      UUID id,
      String name,
      AccountType type,
      AccountStatus status,
      Money balance
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.status = status;
    this.balance = balance;
  }

  /**
   * Opens a new active account.
   *
   * @param name account name
   * @param type account type
   * @param openingBalance initial account balance
   * @return a new account
   */
  public static Account open(
      String name,
      AccountType type,
      Money openingBalance
  ) {
    validateName(name);
    validateType(type);
    validateBalance(openingBalance);

    return new Account(
        UUID.randomUUID(),
        name.trim(),
        type,
        AccountStatus.ACTIVE,
        openingBalance
    );
  }

  /**
   * Restores an account from persisted data.
   *
   * @param id account identifier
   * @param name account name
   * @param type account type
   * @param status account status
   * @param balance account balance
   * @return a restored account
   */
  public static Account restore(
      UUID id,
      String name,
      AccountType type,
      AccountStatus status,
      Money balance
  ) {
    validateId(id);
    validateName(name);
    validateType(type);
    validateStatus(status);
    validateBalance(balance);

    return new Account(
        id,
        name.trim(),
        type,
        status,
        balance
    );
  }

  /**
   * Adds an amount to the account balance.
   *
   * @param amount amount to credit
   */
  public void credit(Money amount) {
    ensureActive();
    validateOperationAmount(amount);

    balance = balance.add(amount);
  }

  /**
   * Subtracts an amount from the account balance.
   *
   * @param amount amount to debit
   */
  public void debit(Money amount) {
    ensureActive();
    validateOperationAmount(amount);

    balance = balance.subtract(amount);
  }

  /**
   * Deactivates the account.
   */
  public void deactivate() {
    if (status == AccountStatus.INACTIVE) {
      throw new IllegalStateException(
          "Account is already inactive"
      );
    }

    status = AccountStatus.INACTIVE;
  }

  /**
   * Changes the account name.
   *
   * @param newName new account name
   */
  public void rename(String newName) {
    ensureActive();
    validateName(newName);

    name = newName.trim();
  }

  /**
   * Changes the account type.
   *
   * @param newType new account type
   */
  public void changeType(AccountType newType) {
    ensureActive();
    validateType(newType);

    type = newType;
  }

  /**
   * Returns the account identifier.
   *
   * @return account identifier
   */
  public UUID getId() {
    return id;
  }

  /**
   * Returns the account name.
   *
   * @return account name
   */
  public String getName() {
    return name;
  }

  /**
   * Returns the account type.
   *
   * @return account type
   */
  public AccountType getType() {
    return type;
  }

  /**
   * Returns the account status.
   *
   * @return account status
   */
  public AccountStatus getStatus() {
    return status;
  }

  /**
   * Returns the account balance.
   *
   * @return account balance
   */
  public Money getBalance() {
    return balance;
  }

  /**
   * Checks whether the account is active.
   *
   * @return true if the account is active
   */
  public boolean isActive() {
    return status == AccountStatus.ACTIVE;
  }

  /**
   * Ensures that the account is active.
   */
  private void ensureActive() {
    if (status == AccountStatus.INACTIVE) {
      throw new IllegalStateException(
          "Account is inactive"
      );
    }
  }

  /**
   * Validates an account identifier.
   *
   * @param id account identifier
   */
  private static void validateId(UUID id) {
    if (id == null) {
      throw new IllegalArgumentException(
          "Account ID cannot be null"
      );
    }
  }

  /**
   * Validates an account status.
   *
   * @param status account status
   */
  private static void validateStatus(AccountStatus status) {
    if (status == null) {
      throw new IllegalArgumentException(
          "Account status cannot be null"
      );
    }
  }

  /**
   * Validates an account name.
   *
   * @param name account name
   */
  private static void validateName(String name) {
    if (name == null || name.isBlank()) {
      throw new IllegalArgumentException(
          "Account name cannot be null or blank"
      );
    }
  }

  /**
   * Validates an account type.
   *
   * @param type account type
   */
  private static void validateType(AccountType type) {
    if (type == null) {
      throw new IllegalArgumentException(
          "Account type cannot be null"
      );
    }
  }

  /**
   * Validates an account balance.
   *
   * @param balance account balance
   */
  private static void validateBalance(Money balance) {
    if (balance == null) {
      throw new IllegalArgumentException(
          "Account balance cannot be null"
      );
    }
  }

  /**
   * Validates an operation amount.
   *
   * @param amount operation amount
   */
  private static void validateOperationAmount(Money amount) {
    if (amount == null) {
      throw new IllegalArgumentException(
          "Operation amount cannot be null"
      );
    }

    if (amount.isZero() || amount.isNegative()) {
      throw new IllegalArgumentException(
          "Operation amount must be greater than zero"
      );
    }
  }
}
