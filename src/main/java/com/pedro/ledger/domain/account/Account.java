package com.pedro.ledger.domain.account;

import com.pedro.ledger.domain.money.Money;
import java.util.UUID;

/**
 * Represents a bank account within the Ledger.
 *
 * <p>An Account owns a monetary balance and allows controlled
 * credit and debit operations while active.</p>
 */
public class Account {

  private final UUID id;
  private final String name;
  private final AccountType type;

  private AccountStatus status;
  private Money balance;

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

  public static Account open(
      String name,
      AccountType type,
      Money openingBalance
  ) {
    validateName(name);
    validateType(type);
    validateOpeningBalance(openingBalance);

    return new Account(
        UUID.randomUUID(),
        name.trim(),
        type,
        AccountStatus.ACTIVE,
        openingBalance
    );
  }

  public void credit(Money amount) {
    ensureActive();
    validateOperationAmount(amount);

    balance = balance.add(amount);
  }

  public void debit(Money amount) {
    ensureActive();
    validateOperationAmount(amount);

    balance = balance.subtract(amount);
  }

  public void deactivate() {
    if (status == AccountStatus.INACTIVE) {
      throw new IllegalStateException(
          "Account is already inactive"
      );
    }

    status = AccountStatus.INACTIVE;
  }

  public UUID getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public AccountType getType() {
    return type;
  }

  public AccountStatus getStatus() {
    return status;
  }

  public Money getBalance() {
    return balance;
  }

  public boolean isActive() {
    return status == AccountStatus.ACTIVE;
  }

  private void ensureActive() {
    if (status == AccountStatus.INACTIVE) {
      throw new IllegalStateException(
          "Account is inactive"
      );
    }
  }

  private static void validateName(String name) {
    if (name == null || name.isBlank()) {
      throw new IllegalArgumentException(
          "Account name cannot be null or blank"
      );
    }
  }

  private static void validateType(AccountType type) {
    if (type == null) {
      throw new IllegalArgumentException(
          "Account type cannot be null"
      );
    }
  }

  private static void validateOpeningBalance(Money openingBalance) {
    if (openingBalance == null) {
      throw new IllegalArgumentException(
          "Opening balance cannot be null"
      );
    }
  }

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