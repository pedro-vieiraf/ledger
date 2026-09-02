package com.pedro.ledger.infrastructure.persistence.transaction;

import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.infrastructure.persistence.account.AccountEntity;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Component;

/**
 * Maps transactions between the domain and persistence layers.
 */
@Component
public class TransactionMapper {

  private final EntityManager entityManager;

  /**
   * Creates a transaction mapper.
   *
   * @param entityManager JPA entity manager
   */
  public TransactionMapper(EntityManager entityManager) {
    this.entityManager = entityManager;
  }

  /**
   * Maps a domain transaction to a persistence entity.
   *
   * @param transaction domain transaction
   * @return persistence entity
   */
  public TransactionEntity toEntity(Transaction transaction) {
    AccountEntity account = entityManager.getReference(
        AccountEntity.class,
        transaction.getAccountId()
    );

    AccountEntity destinationAccount = null;

    if (transaction.getDestinationAccountId() != null) {
      destinationAccount = entityManager.getReference(
          AccountEntity.class,
          transaction.getDestinationAccountId()
      );
    }

    return new TransactionEntity(
        transaction.getId(),
        transaction.getAmount().amount(),
        transaction.getAmount().currency(),
        transaction.getType(),
        transaction.getDescription(),
        transaction.getTimestamp(),
        transaction.getSource(),
        account,
        destinationAccount,
        transaction.getCategoryId()
    );
  }

  /**
   * Maps a persistence entity to a domain transaction.
   *
   * @param entity persistence entity
   * @return domain transaction
   */
  public Transaction toDomain(TransactionEntity entity) {
    return Transaction.restore(
        entity.getId(),
        Money.of(
            entity.getAmount(),
            entity.getCurrency()
        ),
        entity.getType(),
        entity.getDescription(),
        entity.getTimestamp(),
        entity.getSource(),
        entity.getAccountId(),
        entity.getDestinationAccountId(),
        entity.getCategoryId()
    );
  }
}
