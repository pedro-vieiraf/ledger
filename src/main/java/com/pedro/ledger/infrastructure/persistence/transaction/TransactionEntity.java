package com.pedro.ledger.infrastructure.persistence.transaction;

import com.pedro.ledger.domain.transaction.TransactionSource;
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
import java.time.Instant;
import java.util.Currency;
import java.util.UUID;

/**
 * JPA entity representing a transaction in the persistence layer.
 */
@Entity
@Table(name = "transactions")
public class TransactionEntity {

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
      TransactionType type,
      String description,
      Instant timestamp,
      TransactionSource source,
      AccountEntity account,
      AccountEntity destinationAccount,
      UUID categoryId
  ) {
    this.id = id;
    this.amount = amount;
    this.currency = currency.getCurrencyCode();
    this.type = type;
    this.description = description;
    this.timestamp = timestamp;
    this.source = source;
    this.account = account;
    this.destinationAccount = destinationAccount;
    this.categoryId = categoryId;
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
}