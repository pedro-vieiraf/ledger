package com.pedro.ledger.infrastructure.persistence.account;

import com.pedro.ledger.domain.account.AccountStatus;
import com.pedro.ledger.domain.account.AccountType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * JPA entity representing an account in the persistence layer.
 */
@Entity
@Table(name = "accounts")
public class AccountEntity {

  @Id
  private UUID id;

  @Column(nullable = false)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private AccountType type;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private AccountStatus status;

  @Column(nullable = false, precision = 19, scale = 2)
  private BigDecimal balance;

  /**
   * Protected constructor required by JPA.
   */
  protected AccountEntity() {
  }

  /**
   * Creates an account persistence entity.
   *
   * @param id account identifier
   * @param name account name
   * @param type account type
   * @param status account status
   * @param balance account balance
   */
  public AccountEntity(
      UUID id,
      String name,
      AccountType type,
      AccountStatus status,
      BigDecimal balance
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.status = status;
    this.balance = balance;
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
  public BigDecimal getBalance() {
    return balance;
  }
}