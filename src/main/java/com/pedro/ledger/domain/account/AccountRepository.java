package com.pedro.ledger.domain.account;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Defines the persistence operations available for accounts.
 */
public interface AccountRepository {

  /**
   * Saves an account.
   *
   * @param account account to save
   * @return the saved account
   */
  Account save(Account account);

  /**
   * Finds an account by its identifier.
   *
   * @param id account identifier
   * @return an Optional containing the account if found
   */
  Optional<Account> findById(UUID id);

  /**
   * Finds all accounts.
   *
   * @return a list containing all accounts
   */
  List<Account> findAll();
}