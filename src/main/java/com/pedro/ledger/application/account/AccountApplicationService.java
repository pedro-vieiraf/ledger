package com.pedro.ledger.application.account;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountRepository;
import com.pedro.ledger.domain.account.AccountType;
import com.pedro.ledger.domain.money.Money;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;

@Service
public class AccountApplicationService {

  private final AccountRepository accountRepository;

  public AccountApplicationService(
      AccountRepository accountRepository
  ) {
    this.accountRepository = accountRepository;
  }

  public Account create(
      String name,
      AccountType type,
      BigDecimal openingBalance
  ) {
    Money money = new Money(openingBalance);

    Account account = Account.open(
        name,
        type,
        money
    );

    return accountRepository.save(account);
  }
}