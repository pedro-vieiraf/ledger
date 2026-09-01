package com.pedro.ledger.infrastructure.persistence.account;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

/**
 * Persistence adapter responsible for account data access.
 */
@Repository
public class AccountPersistenceRepository implements AccountRepository {

  private final AccountJpaRepository jpaRepository;
  private final AccountMapper mapper;

  /**
   * Creates an account persistence repository.
   *
   * @param jpaRepository JPA repository used for database access
   * @param mapper mapper used to convert between domain objects and entities
   */
  public AccountPersistenceRepository(
      AccountJpaRepository jpaRepository,
      AccountMapper mapper
  ) {
    this.jpaRepository = jpaRepository;
    this.mapper = mapper;
  }

  /**
   * Saves an account to the database.
   *
   * @param account account to save
   * @return the saved account
   */
  @Override
  public Account save(Account account) {
    AccountEntity entity = mapper.toEntity(account);

    AccountEntity savedEntity = jpaRepository.save(entity);

    return mapper.toDomain(savedEntity);
  }

  /**
   * Finds an account by its identifier.
   *
   * @param id account identifier
   * @return an Optional containing the account if found
   */
  @Override
  public Optional<Account> findById(UUID id) {
    return jpaRepository.findById(id)
        .map(mapper::toDomain);
  }

  /**
   * Finds all accounts.
   *
   * @return a list containing all accounts
   */
  @Override
  public List<Account> findAll() {
    return jpaRepository.findAll()
        .stream()
        .map(mapper::toDomain)
        .toList();
  }
}