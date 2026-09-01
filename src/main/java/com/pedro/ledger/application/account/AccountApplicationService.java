package com.pedro.ledger.application.account;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountRepository;
import com.pedro.ledger.domain.account.AccountType;
import com.pedro.ledger.domain.money.Money;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
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

  public Optional<Account> findById(UUID id) {
    return accountRepository.findById(id);
  }

  public List<Account> findAll() {
    return accountRepository.findAll();
  }

  public Account update(UUID id, String name, AccountType type) {
    Account account = accountRepository.findById(id)
        .orElseThrow(() ->
            new IllegalArgumentException("Account not found")
        );

    if (name != null) {
      account.rename(name);
    }

    if (type != null) {
      account.changeType(type);
    }

    return accountRepository.save(account);
  }
}