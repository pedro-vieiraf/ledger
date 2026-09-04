package com.pedro.ledger.infrastructure.web.account;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountStatus;
import com.pedro.ledger.domain.account.AccountType;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * Represents the response returned by account endpoints.
 *
 * @param id account identifier
 * @param name account name
 * @param type account type
 * @param status account status
 * @param balance account balance
 */
public record AccountResponse(
    UUID id,
    String name,
    AccountType type,
    AccountStatus status,
    BigDecimal balance
) {

  /**
   * Creates an account response from a domain account.
   *
   * @param account account domain object
   * @return response representing the account
   */
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