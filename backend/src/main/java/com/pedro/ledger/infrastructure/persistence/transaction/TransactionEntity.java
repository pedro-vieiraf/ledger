package com.pedro.ledger.infrastructure.persistence.transaction;

import com.pedro.ledger.domain.transaction.TransactionSource;
import com.pedro.ledger.domain.transaction.TransactionStatus;
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
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Currency;
import java.util.UUID;

/**
 * JPA entity representing a transaction in the persistence layer.
 */
@Entity
@Table(
    name = "transactions",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_transactions_recurrence_occurrence",
        columnNames = {"recurrence_id", "occurrence_date"}
    )
)
public class TransactionEntity {

  @Id
  private UUID id;

  @Column(nullable = false, precision = 19, scale = 2)
  private BigDecimal amount;

  @Column(nullable = false, length = 3)
  private String currency;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private TransactionStatus status;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private TransactionType type;

  @Column
  private String description;

  @Column(nullable = false)
  private Instant timestamp;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private TransactionSource source;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "account_id", nullable = false)
  private AccountEntity account;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "destination_account_id")
  private AccountEntity destinationAccount;

  @Column
  private UUID categoryId;

  @Column(name = "recurrence_id")
  private UUID recurrenceId;

  @Column(name = "occurrence_date")
  private LocalDate occurrenceDate;

  /**
   * Protected constructor required by JPA.
   */
  protected TransactionEntity() {
  }

  /**
   * Creates a transaction persistence entity.
   *
   * @param id transaction identifier
   * @param amount transaction amount
   * @param currency transaction currency
   * @param status transaction status
   * @param type transaction type
   * @param description transaction description
   * @param timestamp transaction timestamp
   * @param source transaction source
   * @param account source account
   * @param destinationAccount destination account
   * @param categoryId category identifier
   */
  public TransactionEntity(
      UUID id,
      BigDecimal amount,
      Currency currency,
      TransactionStatus status,
      TransactionType type,
      String description,
      Instant timestamp,
      TransactionSource source,
      AccountEntity account,
      AccountEntity destinationAccount,
      UUID categoryId
  ) {
    this(
        id,
        amount,
        currency,
        status,
        type,
        description,
        timestamp,
        source,
        account,
        destinationAccount,
        categoryId,
        null,
        null
    );
  }

  /**
   * Creates a transaction persistence entity, optionally linked to a
   * recurrence occurrence.
   *
   * @param id transaction identifier
   * @param amount transaction amount
   * @param currency transaction currency
   * @param status transaction status
   * @param type transaction type
   * @param description transaction description
   * @param timestamp transaction timestamp
   * @param source transaction source
   * @param account source account
   * @param destinationAccount destination account
   * @param categoryId category identifier
   * @param recurrenceId recurrence identifier, or null
   * @param occurrenceDate occurrence date, or null
   */
  public TransactionEntity(
      UUID id,
      BigDecimal amount,
      Currency currency,
      TransactionStatus status,
      TransactionType type,
      String description,
      Instant timestamp,
      TransactionSource source,
      AccountEntity account,
      AccountEntity destinationAccount,
      UUID categoryId,
      UUID recurrenceId,
      LocalDate occurrenceDate
  ) {
    this.id = id;
    this.amount = amount;
    this.currency = currency.getCurrencyCode();
    this.status = status;
    this.type = type;
    this.description = description;
    this.timestamp = timestamp;
    this.source = source;
    this.account = account;
    this.destinationAccount = destinationAccount;
    this.categoryId = categoryId;
    this.recurrenceId = recurrenceId;
    this.occurrenceDate = occurrenceDate;
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
  public BigDecimal getAmount() {
    return amount;
  }

  /**
   * Returns the transaction currency.
   *
   * @return transaction currency
   */
  public Currency getCurrency() {
    return Currency.getInstance(currency);
  }

  /**
   * Returns the transaction status.
   *
   * @return transaction status
   */
  public TransactionStatus getStatus() {
    return status;
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
   * @return transaction description
   */
  public String getDescription() {
    return description;
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
   * Returns the source account identifier.
   *
   * @return source account identifier
   */
  public UUID getAccountId() {
    return account.getId();
  }

  /**
   * Returns the destination account identifier.
   *
   * @return destination account identifier
   */
  public UUID getDestinationAccountId() {
    return destinationAccount == null
        ? null
        : destinationAccount.getId();
  }

  /**
   * Returns the category identifier.
   *
   * @return category identifier
   */
  public UUID getCategoryId() {
    return categoryId;
  }

  /**
   * Returns the recurrence identifier.
   *
   * @return recurrence identifier, or null for ordinary transactions
   */
  public UUID getRecurrenceId() {
    return recurrenceId;
  }

  /**
   * Returns the recurrence occurrence date.
   *
   * @return occurrence date, or null for ordinary transactions
   */
  public LocalDate getOccurrenceDate() {
    return occurrenceDate;
  }
}