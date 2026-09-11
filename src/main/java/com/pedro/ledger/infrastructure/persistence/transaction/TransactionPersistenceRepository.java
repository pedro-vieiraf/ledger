package com.pedro.ledger.infrastructure.persistence.transaction;

import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.domain.transaction.TransactionRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class TransactionPersistenceRepository implements TransactionRepository {

  private final TransactionJpaRepository jpaRepository;
  private final TransactionMapper mapper;


  public TransactionPersistenceRepository(TransactionJpaRepository jpaRepository,
      TransactionMapper mapper) {
    this.jpaRepository = jpaRepository;
    this.mapper = mapper;
  }

  @Override
  public Transaction save(Transaction transaction) {
    TransactionEntity entity = mapper.toEntity(transaction);

    TransactionEntity savedEntity = jpaRepository.save(entity);

    return mapper.toDomain(savedEntity);
  }

  @Override
  public Optional<Transaction> findById(UUID id) {
    return jpaRepository.findById(id)
        .map(mapper::toDomain);
  }

  @Override
  public List<Transaction> findAll() {
    return jpaRepository.findAll()
        .stream()
        .map(mapper::toDomain)
        .toList();
  }

  @Override
  public void delete(UUID id) {
    jpaRepository.deleteById(id);
  }
}
