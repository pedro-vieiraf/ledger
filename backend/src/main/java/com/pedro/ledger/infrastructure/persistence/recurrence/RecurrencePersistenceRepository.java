package com.pedro.ledger.infrastructure.persistence.recurrence;

import com.pedro.ledger.domain.recurrence.Recurrence;
import com.pedro.ledger.domain.recurrence.RecurrenceRepository;
import com.pedro.ledger.domain.recurrence.RecurrenceStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

/**
 * Persistence adapter responsible for recurrence data access.
 */
@Repository
public class RecurrencePersistenceRepository implements RecurrenceRepository {

  private final RecurrenceJpaRepository jpaRepository;
  private final RecurrenceMapper mapper;

  public RecurrencePersistenceRepository(
      RecurrenceJpaRepository jpaRepository,
      RecurrenceMapper mapper
  ) {
    this.jpaRepository = jpaRepository;
    this.mapper = mapper;
  }

  @Override
  public Recurrence save(Recurrence recurrence) {
    RecurrenceEntity entity = mapper.toEntity(recurrence);
    RecurrenceEntity savedEntity = jpaRepository.save(entity);

    return mapper.toDomain(savedEntity);
  }

  @Override
  public Optional<Recurrence> findById(UUID id) {
    return jpaRepository.findById(id)
        .map(mapper::toDomain);
  }

  @Override
  public Optional<Recurrence> findByIdForUpdate(UUID id) {
    return jpaRepository.findByIdForUpdate(id)
        .map(mapper::toDomain);
  }

  @Override
  public List<Recurrence> findAll() {
    return jpaRepository.findAll()
        .stream()
        .map(mapper::toDomain)
        .toList();
  }

  @Override
  public List<UUID> findDueIds(LocalDate date) {
    return jpaRepository.findDueIds(
        RecurrenceStatus.ACTIVE,
        date
    );
  }

  @Override
  public void delete(UUID id) {
    jpaRepository.deleteById(id);
  }
}
