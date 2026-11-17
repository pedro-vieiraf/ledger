package com.pedro.ledger.infrastructure.persistence.transaction;

import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.domain.transaction.TransactionRepository;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class TransactionPersistenceRepository implements TransactionRepository {

  private final TransactionJpaRepository jpaRepository;
  private final TransactionMapper mapper;
  private final EntityManager entityManager;

  public TransactionPersistenceRepository(TransactionJpaRepository jpaRepository,
      TransactionMapper mapper, EntityManager entityManager) {
    this.jpaRepository = jpaRepository;
    this.mapper = mapper;
    this.entityManager = entityManager;
  }

  @Override
  public Transaction save(Transaction transaction) {
    TransactionEntity entity = mapper.toEntity(transaction);

    // New transactions are inserted with persist so the primary key rejects
    // concurrent duplicates. Merge could turn a duplicate into an update and
    // apply the balance twice.
    if (jpaRepository.existsById(transaction.getId())) {
      entity = jpaRepository.save(entity);
    } else {
      entityManager.persist(entity);
      entityManager.flush();
    }

    return mapper.toDomain(entity);
  }

  @Override
  public Optional<Transaction> findById(UUID id) {
    return jpaRepository.findById(id)
        .map(mapper::toDomain);
  }

  @Override
  public Optional<Transaction> findByRecurrenceIdAndOccurrenceDate(
      UUID recurrenceId,
      LocalDate occurrenceDate
  ) {
    return jpaRepository
        .findByRecurrenceIdAndOccurrenceDate(recurrenceId, occurrenceDate)
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
  public void clearRecurrenceLink(UUID recurrenceId) {
    jpaRepository.clearRecurrenceLink(recurrenceId);
  }

  @Override
  public void delete(UUID id) {
    jpaRepository.deleteById(id);
  }
}
