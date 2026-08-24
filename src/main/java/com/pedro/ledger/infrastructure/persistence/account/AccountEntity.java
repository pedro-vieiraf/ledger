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

  protected AccountEntity() {
  }

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

  public BigDecimal getBalance() {
    return balance;
  }
}