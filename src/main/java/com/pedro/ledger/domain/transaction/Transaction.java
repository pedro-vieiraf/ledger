package com.pedro.ledger.domain.transaction;

import com.pedro.ledger.domain.money.Money;
import java.time.Instant;
import java.util.UUID;

/**
 * Represents a financial transaction within the Ledger.
 */
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

  /**
   * Creates a new financial transaction.
   *
   * @param amount transaction amount
   * @param type transaction type
   * @param description optional transaction description
   * @param timestamp transaction timestamp
   * @param source transaction source
   * @param accountId identifier of the source account
   * @param destinationAccountId identifier of the destination account for
   *     transfers
   * @param categoryId identifier of the transaction category
   * @return a new transaction
   * @throws IllegalArgumentException if any required value is invalid or if
   *     the transaction violates its type-specific rules
   */
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

  /**
   * Changes the transaction amount.
   *
   * @param newAmount new transaction amount
   * @throws IllegalStateException if the transaction was imported through
   *     Open Finance
   * @throws IllegalArgumentException if the amount is invalid
   */
  public void changeAmount(Money newAmount) {
    if (source == TransactionSource.OPEN_FINANCE) {
      throw new IllegalStateException(
          "Open Finance transactions cannot have their amount changed"
      );
    }

    validateAmount(newAmount);

    this.amount = newAmount;
  }

  /**
   * Changes the transaction description.
   *
   * @param newDescription new transaction description
   */
  public void changeDescription(String newDescription) {
    this.description = normalizeDescription(newDescription);
  }

  /**
   * Returns the transaction identifier.
   *
   * @return transaction identifier
   */
  public UUID getId() {
    return id;
  }

  /**
   * Returns the transaction amount.
   *
   * @return transaction amount
   */
  public Money getAmount() {
    return amount;
  }

  /**
   * Returns the transaction type.
   *
   * @return transaction type
   */
  public TransactionType getType() {
    return type;
  }

  /**
   * Returns the transaction description.
   *
   * @return transaction description, or null if none was provided
   */
  public String getDescription() {
    return description;
  }

  /**
   * Returns the transaction category identifier.
   *
   * @return category identifier, or null if no category is associated
   */
  public UUID getCategoryId() {
    return categoryId;
  }

  /**
   * Returns the transaction timestamp.
   *
   * @return transaction timestamp
   */
  public Instant getTimestamp() {
    return timestamp;
  }

  /**
   * Returns the transaction source.
   *
   * @return transaction source
   */
  public TransactionSource getSource() {
    return source;
  }

  /**
   * Returns the identifier of the account associated with the transaction.
   *
   * @return account identifier
   */
  public UUID getAccountId() {
    return accountId;
  }

  /**
   * Returns the destination account identifier.
   *
   * @return destination account identifier, or null if the transaction is not
   *     a transfer
   */
  public UUID getDestinationAccountId() {
    return destinationAccountId;
  }

  /**
   * Validates the transaction amount.
   *
   * @param amount transaction amount to validate
   * @throws IllegalArgumentException if the amount is null, zero, or negative
   */
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

  /**
   * Validates the transaction type.
   *
   * @param type transaction type to validate
   * @throws IllegalArgumentException if the type is null
   */
  private static void validateType(TransactionType type) {
    if (type == null) {
      throw new IllegalArgumentException(
          "Transaction type cannot be null"
      );
    }
  }

  /**
   * Normalizes an optional transaction description.
   *
   * @param description description to normalize
   * @return trimmed description, or null if the description is null or blank
   */
  private static String normalizeDescription(String description) {
    if (description == null || description.isBlank()) {
      return null;
    }

    return description.trim();
  }

  /**
   * Validates the transaction category according to its type.
   *
   * @param type transaction type
   * @param categoryId transaction category identifier
   * @throws IllegalArgumentException if a transfer has a category
   */
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

  /**
   * Changes the transaction category.
   *
   * @param newCategoryId new category identifier
   * @throws IllegalStateException if a transfer is assigned a category
   */
  public void changeCategory(UUID newCategoryId) {
    if (type == TransactionType.TRANSFER && newCategoryId != null) {
      throw new IllegalStateException(
          "Transfer transactions cannot have a category"
      );
    }

    this.categoryId = newCategoryId;
  }

  /**
   * Validates the transaction timestamp.
   *
   * @param timestamp transaction timestamp to validate
   * @throws IllegalArgumentException if the timestamp is null
   */
  private static void validateTimestamp(Instant timestamp) {
    if (timestamp == null) {
      throw new IllegalArgumentException(
          "Transaction timestamp cannot be null"
      );
    }
  }

  /**
   * Validates the transaction source.
   *
   * @param source transaction source to validate
   * @throws IllegalArgumentException if the source is null
   */
  private static void validateSource(TransactionSource source) {
    if (source == null) {
      throw new IllegalArgumentException(
          "Transaction source cannot be null"
      );
    }
  }

  /**
   * Validates the account identifier.
   *
   * @param accountId account identifier to validate
   * @throws IllegalArgumentException if the identifier is null
   */
  private static void validateAccountId(UUID accountId) {
    if (accountId == null) {
      throw new IllegalArgumentException(
          "Transaction account ID cannot be null"
      );
    }
  }

  /**
   * Validates the destination account according to the transaction type.
   *
   * @param type transaction type
   * @param destinationAccountId destination account identifier
   * @throws IllegalArgumentException if the destination account is invalid
   *     for the transaction type
   */
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

  /**
   * Validates that a transfer does not use the same account as source and
   * destination.
   *
   * @param type transaction type
   * @param accountId source account identifier
   * @param destinationAccountId destination account identifier
   * @throws IllegalArgumentException if both account identifiers are equal
   *     for a transfer
   */
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