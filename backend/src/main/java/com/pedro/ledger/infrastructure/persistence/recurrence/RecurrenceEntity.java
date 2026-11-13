package com.pedro.ledger.infrastructure.persistence.recurrence;

import com.pedro.ledger.domain.recurrence.RecurrenceFrequency;
import com.pedro.ledger.domain.recurrence.RecurrenceStatus;
import com.pedro.ledger.domain.transaction.TransactionType;
import com.pedro.ledger.infrastructure.persistence.account.AccountEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Currency;
import java.util.UUID;

/**
 * JPA entity representing a recurrence rule.
 */
@Entity
@Table(name = "recurrences")
public class RecurrenceEntity {

  @Id
  private UUID id;

  @Column(nullable = false, precision = 19, scale = 2)
  private BigDecimal amount;

  @Column(nullable = false, length = 3)
  private String currency;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private TransactionType type;

  @Column
  private String description;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "account_id", nullable = false)
  private AccountEntity account;

  @Column(name = "category_id")
  private UUID categoryId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private RecurrenceFrequency frequency;

  @Column(name = "start_date", nullable = false)
  private LocalDate startDate;

  @Column(name = "next_occurrence", nullable = false)
  private LocalDate nextOccurrence;

  @Column(name = "day_of_month", nullable = false)
  private int dayOfMonth;

  @Column(name = "month_of_year", nullable = false)
  private int monthOfYear;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private RecurrenceStatus status;

  /**
   * Protected constructor required by JPA.
   */
  protected RecurrenceEntity() {
  }

  /**
   * Creates a recurrence persistence entity.
   *
   * @param id recurrence identifier
   * @param amount recurrence amount
   * @param currency recurrence currency
   * @param type transaction type
   * @param description recurrence description
   * @param account account associated with the recurrence
   * @param categoryId category identifier
   * @param frequency recurrence frequency
   * @param startDate recurrence start date
   * @param nextOccurrence next occurrence date
   * @param dayOfMonth configured day of the month
   * @param monthOfYear configured month of the year
   * @param status recurrence status
   */
  public RecurrenceEntity(
      UUID id,
      BigDecimal amount,
      Currency currency,
      TransactionType type,
      String description,
      AccountEntity account,
      UUID categoryId,
      RecurrenceFrequency frequency,
      LocalDate startDate,
      LocalDate nextOccurrence,
      int dayOfMonth,
      int monthOfYear,
      RecurrenceStatus status
  ) {
    this.id = id;
    this.amount = amount;
    this.currency = currency.getCurrencyCode();
    this.type = type;
    this.description = description;
    this.account = account;
    this.categoryId = categoryId;
    this.frequency = frequency;
    this.startDate = startDate;
    this.nextOccurrence = nextOccurrence;
    this.dayOfMonth = dayOfMonth;
    this.monthOfYear = monthOfYear;
    this.status = status;
  }

  public UUID getId() {
    return id;
  }

  public BigDecimal getAmount() {
    return amount;
  }

  public Currency getCurrency() {
    return Currency.getInstance(currency);
  }

  public TransactionType getType() {
    return type;
  }

  public String getDescription() {
    return description;
  }

  public AccountEntity getAccount() {
    return account;
  }

  public UUID getAccountId() {
    return account.getId();
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

  public LocalDate getNextOccurrence() {
    return nextOccurrence;
  }

  public int getDayOfMonth() {
    return dayOfMonth;
  }

  public int getMonthOfYear() {
    return monthOfYear;
  }

  public RecurrenceStatus getStatus() {
    return status;
  }
}
