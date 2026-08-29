package com.pedro.ledger.infrastructure.web.account;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountStatus;
import com.pedro.ledger.domain.account.AccountType;
import java.math.BigDecimal;
import java.util.UUID;

public record AccountResponse(
    UUID id,
    String name,
    AccountType type,
    AccountStatus status,
    BigDecimal balance
) {

  public static AccountResponse from(Account account) {
    return new AccountResponse(
        account.getId(),
        account.getName(),
        account.getType(),
        account.getStatus(),
        account.getBalance().amount()
    );
  }
}
