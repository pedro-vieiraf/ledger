package com.pedro.ledger.domain.recurrence;

import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.transaction.TransactionType;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.UUID;

public class Recurrence {

  private final UUID id;
  private final Money amount;
  private final TransactionType type;
  private final String description;
  private final UUID accountId;
  private final UUID categoryId;
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

  public void deactivate() {
    if (status == RecurrenceStatus.INACTIVE) {
      throw new IllegalStateException(
          "Recurrence is already inactive"
      );
    }

    status = RecurrenceStatus.INACTIVE;
  }

  public void activate() {
    if (status == RecurrenceStatus.ACTIVE) {
      throw new IllegalStateException(
          "Recurrence is already active"
      );
    }

    status = RecurrenceStatus.ACTIVE;
  }

  public void advanceToNextOccurrence() {
    ensureActive();

    nextOccurrence = switch (frequency) {
      case DAILY -> nextOccurrence.plusDays(1);

      case WEEKLY -> nextOccurrence.plusWeeks(1);

      case MONTHLY -> nextMonthlyOccurrence();

      case YEARLY -> nextYearlyOccurrence();
    };
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

  public UUID getAccountId() {
    return accountId;
  }

  public UUID getCategoryId() {
    return categoryId;
  }

  public RecurrenceFrequency getFrequency() {
    return frequency;
  }

  public LocalDate getStartDate() {
    return startDate;
  }

  public RecurrenceStatus getStatus() {
    return status;
  }

  public LocalDate getNextOccurrence() {
    return nextOccurrence;
  }

  private LocalDate nextMonthlyOccurrence() {
    LocalDate nextMonth = nextOccurrence.plusMonths(1);

    int lastDayOfNextMonth = nextMonth
        .with(TemporalAdjusters.lastDayOfMonth())
        .getDayOfMonth();

    return nextMonth.withDayOfMonth(
        Math.min(dayOfMonth, lastDayOfNextMonth)
    );
  }

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

  private void ensureActive() {
    if (status == RecurrenceStatus.INACTIVE) {
      throw new IllegalStateException(
          "Recurrence is inactive"
      );
    }
  }

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

  private static void validateType(TransactionType type) {
    if (type == null) {
      throw new IllegalArgumentException(
          "Recurrence type cannot be null"
      );
    }
  }

  private static void validateAccountId(UUID accountId) {
    if (accountId == null) {
      throw new IllegalArgumentException(
          "Recurrence account ID cannot be null"
      );
    }
  }

  private static void validateFrequency(
      RecurrenceFrequency frequency
  ) {
    if (frequency == null) {
      throw new IllegalArgumentException(
          "Recurrence frequency cannot be null"
      );
    }
  }

  private static void validateStartDate(LocalDate startDate) {
    if (startDate == null) {
      throw new IllegalArgumentException(
          "Recurrence start date cannot be null"
      );
    }
  }

  private static String normalizeDescription(String description) {
    if (description == null || description.isBlank()) {
      return null;
    }

    return description.trim();
  }
}