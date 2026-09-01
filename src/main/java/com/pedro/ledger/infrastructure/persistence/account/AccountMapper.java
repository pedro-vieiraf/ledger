package com.pedro.ledger.infrastructure.persistence.account;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.money.Money;
import org.springframework.stereotype.Component;

/**
 * Maps between account domain objects and persistence entities.
 */
@Component
public class AccountMapper {

  /**
   * Converts a domain account into a persistence entity.
   *
   * @param account account domain object
   * @return persistence entity representing the account
   */
  public AccountEntity toEntity(Account account) {
    return new AccountEntity(
        account.getId(),
        account.getName(),
        account.getType(),
        account.getStatus(),
        account.getBalance().amount()
    );
  }

  /**
   * Converts a persistence entity into a domain account.
   *
   * @param entity account persistence entity
   * @return domain account reconstructed from the entity
   */
  public Account toDomain(AccountEntity entity) {
    return Account.restore(
        entity.getId(),
        entity.getName(),
        entity.getType(),
        entity.getStatus(),
        Money.of(entity.getBalance().toPlainString())
    );
  }
}