package com.pedro.ledger.domain.recurrence;

import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.transaction.TransactionType;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.UUID;

/**
 * Represents a recurring financial transaction.
 *
 * <p>A recurrence defines the amount, transaction type, account, category,
 * frequency, and dates used to generate recurring transactions.
 */
public class Recurrence {

  private final UUID id;
  private Money amount;
  private final TransactionType type;
  private String description;
  private final UUID accountId;
  private UUID categoryId;
  private final RecurrenceFrequency frequency;
  private final LocalDate startDate;
  private final int dayOfMonth;
  private final int monthOfYear;

  private RecurrenceStatus status;
  private LocalDate nextOccurrence;

  private Recurrence(
      UUID id,
      Money amount,
      TransactionType type,
      String description,
      UUID accountId,
      UUID categoryId,
      RecurrenceFrequency frequency,
      LocalDate startDate,
      int dayOfMonth,
      int monthOfYear,
      RecurrenceStatus status,
      LocalDate nextOccurrence
  ) {
    this.id = id;
    this.amount = amount;
    this.type = type;
    this.description = description;
    this.accountId = accountId;
    this.categoryId = categoryId;
    this.frequency = frequency;
    this.startDate = startDate;
    this.dayOfMonth = dayOfMonth;
    this.monthOfYear = monthOfYear;
    this.status = status;
    this.nextOccurrence = nextOccurrence;
  }

  /**
   * Creates a new active recurrence.
   *
   * @param amount recurrence amount
   * @param type transaction type
   * @param description optional transaction description
   * @param accountId identifier of the account associated with the recurrence
   * @param categoryId identifier of the category associated with the recurrence
   * @param frequency recurrence frequency
   * @param startDate date on which the recurrence starts
   * @return a new active recurrence
   * @throws IllegalArgumentException if any required value is invalid or
   *     if the transaction type is TRANSFER
   */
  public static Recurrence create(
      Money amount,
      TransactionType type,
      String description,
      UUID accountId,
      UUID categoryId,
      RecurrenceFrequency frequency,
      LocalDate startDate
  ) {
    validateAmount(amount);
    validateType(type);
    validateAccountId(accountId);
    validateFrequency(frequency);
    validateStartDate(startDate);

    if (type == TransactionType.TRANSFER) {
      throw new IllegalArgumentException(
          "Recurrence cannot have transfer type"
      );
    }

    return new Recurrence(
        UUID.randomUUID(),
        amount,
        type,
        normalizeDescription(description),
        accountId,
        categoryId,
        frequency,
        startDate,
        startDate.getDayOfMonth(),
        startDate.getMonthValue(),
        RecurrenceStatus.ACTIVE,
        startDate
    );
  }

  /**
   * Restores an existing recurrence from persistence.
   *
   * @param id recurrence identifier
   * @param amount recurrence amount
   * @param type transaction type
   * @param description optional recurrence description
   * @param accountId identifier of the associated account
   * @param categoryId identifier of the associated category
   * @param frequency recurrence frequency
   * @param startDate recurrence start date
   * @param dayOfMonth configured day of the month
   * @param monthOfYear configured month of the year
   * @param status current recurrence status
   * @param nextOccurrence date of the next occurrence
   * @return a restored recurrence
   * @throws IllegalArgumentException if any required value is invalid
   */
  public static Recurrence restore(
      UUID id,
      Money amount,
      TransactionType type,
      String description,
      UUID accountId,
      UUID categoryId,
      RecurrenceFrequency frequency,
      LocalDate startDate,
      int dayOfMonth,
      int monthOfYear,
      RecurrenceStatus status,
      LocalDate nextOccurrence
  ) {
    if (id == null) {
      throw new IllegalArgumentException(
          "Recurrence ID cannot be null"
      );
    }

    validateAmount(amount);
    validateType(type);
    validateAccountId(accountId);
    validateFrequency(frequency);
    validateStartDate(startDate);

    if (type == TransactionType.TRANSFER) {
      throw new IllegalArgumentException(
          "Recurrence cannot have transfer type"
      );
    }

    if (status == null) {
      throw new IllegalArgumentException(
          "Recurrence status cannot be null"
      );
    }

    if (nextOccurrence == null) {
      throw new IllegalArgumentException(
          "Recurrence next occurrence cannot be null"
      );
    }

    return new Recurrence(
        id,
        amount,
        type,
        normalizeDescription(description),
        accountId,
        categoryId,
        frequency,
        startDate,
        dayOfMonth,
        monthOfYear,
        status,
        nextOccurrence
    );
  }

  /**
   * Changes the recurrence amount. Future occurrences use the new amount;
   * transactions already generated are not affected.
   *
   * @param newAmount new recurrence amount
   * @throws IllegalArgumentException if the amount is invalid or uses a
   *     different currency
   */
  public void changeAmount(Money newAmount) {
    validateAmount(newAmount);

    if (!newAmount.currency().equals(amount.currency())) {
      throw new IllegalArgumentException(
          "Recurrence amount currency cannot change"
      );
    }

    amount = newAmount;
  }

  /**
   * Changes the recurrence description. Future occurrences use the new
   * description; transactions already generated are not affected.
   *
   * @param newDescription new recurrence description
   */
  public void changeDescription(String newDescription) {
    description = normalizeDescription(newDescription);
  }

  /**
   * Changes the recurrence category. Future occurrences use the new category;
   * transactions already generated are not affected.
   *
   * @param newCategoryId new category identifier
   */
  public void changeCategory(UUID newCategoryId) {
    categoryId = newCategoryId;
  }

  /**
   * Deactivates the recurrence.
   *
   * @throws IllegalStateException if the recurrence is already inactive
   */
  public void deactivate() {
    if (status == RecurrenceStatus.INACTIVE) {
      throw new IllegalStateException(
          "Recurrence is already inactive"
      );
    }

    status = RecurrenceStatus.INACTIVE;
  }

  /**
   * Activates the recurrence.
   *
   * @throws IllegalStateException if the recurrence is already active
   */
  public void activate() {
    if (status == RecurrenceStatus.ACTIVE) {
      throw new IllegalStateException(
          "Recurrence is already active"
      );
    }

    status = RecurrenceStatus.ACTIVE;
  }

  /**
   * Advances the recurrence to its next scheduled occurrence.
   *
   * @throws IllegalStateException if the recurrence is inactive
   */
  public void advanceToNextOccurrence() {
    ensureActive();

    nextOccurrence = switch (frequency) {
      case DAILY -> nextOccurrence.plusDays(1);

      case WEEKLY -> nextOccurrence.plusWeeks(1);

      case MONTHLY -> nextMonthlyOccurrence();

      case YEARLY -> nextYearlyOccurrence();
    };
  }

  /**
   * Returns the recurrence identifier.
   *
   * @return recurrence identifier
   */
  public UUID getId() {
    return id;
  }

  /**
   * Returns the recurrence amount.
   *
   * @return recurrence amount
   */
  public Money getAmount() {
    return amount;
  }

  /**
   * Returns the transaction type associated with the recurrence.
   *
   * @return transaction type
   */
  public TransactionType getType() {
    return type;
  }

  /**
   * Returns the recurrence description.
   *
   * @return recurrence description, or null if no description was provided
   */
  public String getDescription() {
    return description;
  }

  /**
   * Returns the identifier of the associated account.
   *
   * @return account identifier
   */
  public UUID getAccountId() {
    return accountId;
  }

  /**
   * Returns the identifier of the associated category.
   *
   * @return category identifier, or null if no category was provided
   */
  public UUID getCategoryId() {
    return categoryId;
  }

  /**
   * Returns the recurrence frequency.
   *
   * @return recurrence frequency
   */
  public RecurrenceFrequency getFrequency() {
    return frequency;
  }

  /**
   * Returns the date on which the recurrence starts.
   *
   * @return recurrence start date
   */
  public LocalDate getStartDate() {
    return startDate;
  }

  /**
   * Returns the configured day of the month.
   *
   * @return configured day of the month
   */
  public int getDayOfMonth() {
    return dayOfMonth;
  }

  /**
   * Returns the configured month of the year.
   *
   * @return configured month of the year
   */
  public int getMonthOfYear() {
    return monthOfYear;
  }

  /**
   * Returns the current recurrence status.
   *
   * @return recurrence status
   */
  public RecurrenceStatus getStatus() {
    return status;
  }

  /**
   * Returns the date of the next occurrence.
   *
   * @return next occurrence date
   */
  public LocalDate getNextOccurrence() {
    return nextOccurrence;
  }

  /**
   * Calculates the next monthly occurrence while preserving the configured
   * day of the month when possible.
   *
   * @return next monthly occurrence
   */
  private LocalDate nextMonthlyOccurrence() {
    LocalDate nextMonth = nextOccurrence.plusMonths(1);

    int lastDayOfNextMonth = nextMonth
        .with(TemporalAdjusters.lastDayOfMonth())
        .getDayOfMonth();

    return nextMonth.withDayOfMonth(
        Math.min(dayOfMonth, lastDayOfNextMonth)
    );
  }

  /**
   * Calculates the next yearly occurrence while preserving the configured
   * month and day when possible.
   *
   * @return next yearly occurrence
   */
  private LocalDate nextYearlyOccurrence() {
    LocalDate nextYear = nextOccurrence.plusYears(1);

    LocalDate targetMonth = nextYear.withMonth(monthOfYear);

    int lastDayOfTargetMonth = targetMonth
        .with(TemporalAdjusters.lastDayOfMonth())
        .getDayOfMonth();

    return targetMonth.withDayOfMonth(
        Math.min(dayOfMonth, lastDayOfTargetMonth)
    );
  }

  /**
   * Ensures that the recurrence is active.
   *
   * @throws IllegalStateException if the recurrence is inactive
   */
  private void ensureActive() {
    if (status == RecurrenceStatus.INACTIVE) {
      throw new IllegalStateException(
          "Recurrence is inactive"
      );
    }
  }

  /**
   * Validates the recurrence amount.
   *
   * @param amount recurrence amount to validate
   * @throws IllegalArgumentException if the amount is null, zero, or negative
   */
  private static void validateAmount(Money amount) {
    if (amount == null) {
      throw new IllegalArgumentException(
          "Recurrence amount cannot be null"
      );
    }

    if (amount.isZero() || amount.isNegative()) {
      throw new IllegalArgumentException(
          "Recurrence amount must be greater than zero"
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
          "Recurrence type cannot be null"
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
          "Recurrence account ID cannot be null"
      );
    }
  }

  /**
   * Validates the recurrence frequency.
   *
   * @param frequency recurrence frequency to validate
   * @throws IllegalArgumentException if the frequency is null
   */
  private static void validateFrequency(
      RecurrenceFrequency frequency
  ) {
    if (frequency == null) {
      throw new IllegalArgumentException(
          "Recurrence frequency cannot be null"
      );
    }
  }

  /**
   * Validates the recurrence start date.
   *
   * @param startDate recurrence start date to validate
   * @throws IllegalArgumentException if the date is null
   */
  private static void validateStartDate(LocalDate startDate) {
    if (startDate == null) {
      throw new IllegalArgumentException(
          "Recurrence start date cannot be null"
      );
    }
  }

  /**
   * Normalizes an optional description by trimming whitespace.
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
}