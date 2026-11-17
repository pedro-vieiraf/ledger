package com.pedro.ledger.infrastructure.persistence.recurrence;

import com.pedro.ledger.domain.recurrence.Recurrence;
import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.infrastructure.persistence.account.AccountEntity;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Component;

/**
 * Maps recurrences between the domain and persistence layers.
 */
@Component
public class RecurrenceMapper {

  private final EntityManager entityManager;

  public RecurrenceMapper(EntityManager entityManager) {
    this.entityManager = entityManager;
  }

  public RecurrenceEntity toEntity(Recurrence recurrence) {
    AccountEntity account = entityManager.getReference(
        AccountEntity.class,
        recurrence.getAccountId()
    );

    return new RecurrenceEntity(
        recurrence.getId(),
        recurrence.getAmount().amount(),
        recurrence.getAmount().currency(),
        recurrence.getType(),
        recurrence.getDescription(),
        account,
        recurrence.getCategoryId(),
        recurrence.getFrequency(),
        recurrence.getStartDate(),
        recurrence.getNextOccurrence(),
        recurrence.getDayOfMonth(),
        recurrence.getMonthOfYear(),
        recurrence.getStatus()
    );
  }

  public Recurrence toDomain(RecurrenceEntity entity) {
    return Recurrence.restore(
        entity.getId(),
        Money.of(entity.getAmount(), entity.getCurrency()),
        entity.getType(),
        entity.getDescription(),
        entity.getAccountId(),
        entity.getCategoryId(),
        entity.getFrequency(),
        entity.getStartDate(),
        entity.getDayOfMonth(),
        entity.getMonthOfYear(),
        entity.getStatus(),
        entity.getNextOccurrence()
    );
  }
}
