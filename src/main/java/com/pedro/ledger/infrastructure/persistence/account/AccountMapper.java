package com.pedro.ledger.infrastructure.persistence.account;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.money.Money;
import org.springframework.stereotype.Component;

@Component
public class AccountMapper {

  public AccountEntity toEntity(Account account) {
    return new AccountEntity(
        account.getId(),
        account.getName(),
        account.getType(),
        account.getStatus(),
        account.getBalance().amount()
    );
  }

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
