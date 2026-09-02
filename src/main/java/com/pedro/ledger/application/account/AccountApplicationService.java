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

/**
 * Application service responsible for account use cases.
 */
@Service
public class AccountApplicationService {

  private final AccountRepository accountRepository;

  /**
   * Creates an account application service.
   *
   * @param accountRepository repository used to persist and retrieve accounts
   */
  public AccountApplicationService(
      AccountRepository accountRepository
  ) {
    this.accountRepository = accountRepository;
  }

  /**
   * Creates a new account.
   *
   * @param name account name
   * @param type account type
   * @param openingBalance initial account balance
   * @return the created account
   */
  public Account create(
      String name,
      AccountType type,
      BigDecimal openingBalance
  ) {
    Money money = Money.of(openingBalance);

    Account account = Account.open(
        name,
        type,
        money
    );

    return accountRepository.save(account);
  }

  /**
   * Finds an account by its identifier.
   *
   * @param id account identifier
   * @return the account if found, otherwise an empty Optional
   */
  public Optional<Account> findById(UUID id) {
    return accountRepository.findById(id);
  }

  /**
   * Finds all accounts.
   *
   * @return a list containing all accounts
   */
  public List<Account> findAll() {
    return accountRepository.findAll();
  }

  /**
   * Updates an account's editable information.
   *
   * @param id account identifier
   * @param name new account name, or null to keep the current name
   * @param type new account type, or null to keep the current type
   * @return the updated account
   * @throws IllegalArgumentException if the account does not exist
   */
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

  /**
   * Deactivates an account.
   *
   * @param id account identifier
   */
  public void deactivate(UUID id) {
    Account account = accountRepository.findById(id)
        .orElseThrow(() ->
            new IllegalArgumentException("Account not found")
        );

    account.deactivate();

    accountRepository.save(account);
  }
}