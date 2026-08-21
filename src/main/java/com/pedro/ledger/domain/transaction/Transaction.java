package com.pedro.ledger.domain.transaction;

import com.pedro.ledger.domain.money.Money;

import java.time.Instant;
import java.util.UUID;

public class Transaction {

  private final UUID id;
  private Money amount;
  private final TransactionType type;
  private String description;
  private final Instant timestamp;
  private final TransactionSource source;
  private final UUID accountId;
  private final UUID destinationAccountId;
  private UUID categoryId;

  private Transaction(
      UUID id,
      Money amount,
      TransactionType type,
      String description,
      Instant timestamp,
      TransactionSource source,
      UUID accountId,
      UUID destinationAccountId,
      UUID categoryId
  ) {
    this.id = id;
    this.amount = amount;
    this.type = type;
    this.description = description;
    this.timestamp = timestamp;
    this.source = source;
    this.accountId = accountId;
    this.destinationAccountId = destinationAccountId;
    this.categoryId = categoryId;
  }

  public static Transaction create(
      Money amount,
      TransactionType type,
      String description,
      Instant timestamp,
      TransactionSource source,
      UUID accountId,
      UUID destinationAccountId,
      UUID categoryId
      ) {
    validateAmount(amount);
    validateType(type);
    validateTimestamp(timestamp);
    validateSource(source);
    validateAccountId(accountId);
    validateDestinationAccount(type, destinationAccountId);
    validateDifferentAccounts(type, accountId, destinationAccountId);
    validateCategory(type, categoryId);

    return new Transaction(
        UUID.randomUUID(),
        amount,
        type,
        normalizeDescription(description),
        timestamp,
        source,
        accountId,
        destinationAccountId,
        categoryId
        );
  }

  public void changeAmount(Money newAmount) {
    if (source == TransactionSource.OPEN_FINANCE) {
      throw new IllegalStateException(
          "Open Finance transactions cannot have their amount changed"
      );
    }

    validateAmount(newAmount);

    this.amount = newAmount;
  }

  public void changeDescription(String newDescription) {
    this.description = normalizeDescription(newDescription);
  }

  public UUID getId() {
    return id;
  }

  public Money getAmount() {
    return amount;
  }

  public TransactionType getType() {
    return type;
  }

  public String getDescription() {
    return description;
  }

  public UUID getCategoryId() {
    return categoryId;
  }

  public Instant getTimestamp() {
    return timestamp;
  }

  public TransactionSource getSource() {
    return source;
  }

  public UUID getAccountId() {
    return accountId;
  }

  public UUID getDestinationAccountId() {
    return destinationAccountId;
  }

  private static void validateAmount(Money amount) {
    if (amount == null) {
      throw new IllegalArgumentException(
          "Transaction amount cannot be null"
      );
    }

    if (amount.isZero() || amount.isNegative()) {
      throw new IllegalArgumentException(
          "Transaction amount must be greater than zero"
      );
    }
  }

  private static void validateType(TransactionType type) {
    if (type == null) {
      throw new IllegalArgumentException(
          "Transaction type cannot be null"
      );
    }
  }

  private static String normalizeDescription(String description) {
    if (description == null || description.isBlank()) {
      return null;
    }

    return description.trim();
  }

  private static void validateCategory(
      TransactionType type,
      UUID categoryId
  ) {
    if (type == TransactionType.TRANSFER && categoryId != null) {
      throw new IllegalArgumentException(
          "Transfer transactions cannot have a category"
      );
    }
  }

  public void changeCategory(UUID newCategoryId) {
    if (type == TransactionType.TRANSFER && newCategoryId != null) {
      throw new IllegalStateException(
          "Transfer transactions cannot have a category"
      );
    }

    this.categoryId = newCategoryId;
  }

  private static void validateTimestamp(Instant timestamp) {
    if (timestamp == null) {
      throw new IllegalArgumentException(
          "Transaction timestamp cannot be null"
      );
    }
  }

  private static void validateSource(TransactionSource source) {
    if (source == null) {
      throw new IllegalArgumentException(
          "Transaction source cannot be null"
      );
    }
  }

  private static void validateAccountId(UUID accountId) {
    if (accountId == null) {
      throw new IllegalArgumentException(
          "Transaction account ID cannot be null"
      );
    }
  }

  private static void validateDestinationAccount(
      TransactionType type,
      UUID destinationAccountId
  ) {
    if (type == TransactionType.TRANSFER && destinationAccountId == null) {
      throw new IllegalArgumentException(
          "Transfer destination account ID cannot be null"
      );
    }

    if (type != TransactionType.TRANSFER && destinationAccountId != null) {
      throw new IllegalArgumentException(
          "Only transfers can have a destination account"
      );
    }
  }

  private static void validateDifferentAccounts(
      TransactionType type,
      UUID accountId,
      UUID destinationAccountId
  ) {
    if (type == TransactionType.TRANSFER
        && accountId.equals(destinationAccountId)) {

      throw new IllegalArgumentException(
          "Transfer source and destination accounts must be different"
      );
    }
  }
}