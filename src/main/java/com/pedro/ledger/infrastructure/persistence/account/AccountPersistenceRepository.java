package com.pedro.ledger.infrastructure.persistence.account;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountRepository;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class AccountPersistenceRepository implements AccountRepository {

  private final AccountJpaRepository jpaRepository;
  private final AccountMapper mapper;

  public AccountPersistenceRepository(
      AccountJpaRepository jpaRepository,
      AccountMapper mapper
  ) {
    this.jpaRepository = jpaRepository;
    this.mapper = mapper;
  }

  @Override
  public Account save(Account account) {
    AccountEntity entity = mapper.toEntity(account);

    AccountEntity savedEntity = jpaRepository.save(entity);

    return mapper.toDomain(savedEntity);
  }

  @Override
  public Optional<Account> findById(UUID id) {
    return jpaRepository.findById(id)
        .map(mapper::toDomain);
  }
}