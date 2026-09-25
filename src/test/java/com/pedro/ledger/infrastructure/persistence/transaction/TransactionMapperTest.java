package com.pedro.ledger.infrastructure.persistence.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.domain.transaction.TransactionSource;
import com.pedro.ledger.domain.transaction.TransactionType;
import com.pedro.ledger.infrastructure.persistence.account.AccountEntity;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.Currency;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TransactionMapperTest {

  private EntityManager entityManager;
  private TransactionMapper mapper;

  @BeforeEach
  void setUp() {
    entityManager = mock(EntityManager.class);
    mapper = new TransactionMapper(entityManager);
  }

  @Test
  void shouldMapDomainToEntity() {
    UUID accountId = UUID.randomUUID();
    UUID categoryId = UUID.randomUUID();
    Instant timestamp = Instant.parse("2026-01-15T12:00:00Z");

    Transaction transaction = Transaction.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "Supermarket",
        timestamp,
        TransactionSource.MANUAL,
        accountId,
        null,
        categoryId
    );

    AccountEntity account = mock(AccountEntity.class);

    when(entityManager.getReference(AccountEntity.class, accountId))
        .thenReturn(account);

    when(account.getId())
        .thenReturn(accountId);

    TransactionEntity entity = mapper.toEntity(transaction);

    assertThat(entity.getId())
        .isEqualTo(transaction.getId());

    assertThat(entity.getAmount())
        .isEqualByComparingTo(transaction.getAmount().amount());

    assertThat(entity.getCurrency())
        .isEqualTo(transaction.getAmount().currency());

    assertThat(entity.getType())
        .isEqualTo(transaction.getType());

    assertThat(entity.getDescription())
        .isEqualTo(transaction.getDescription());

    assertThat(entity.getTimestamp())
        .isEqualTo(transaction.getTimestamp());

    assertThat(entity.getSource())
        .isEqualTo(transaction.getSource());

    assertThat(entity.getAccountId())
        .isEqualTo(accountId);

    assertThat(entity.getDestinationAccountId())
        .isNull();

    assertThat(entity.getCategoryId())
        .isEqualTo(categoryId);
  }

  @Test
  void shouldMapTransferFromDomainToEntity() {
    UUID accountId = UUID.randomUUID();
    UUID destinationAccountId = UUID.randomUUID();
    Instant timestamp = Instant.parse("2026-01-15T12:00:00Z");

    Transaction transaction = Transaction.create(
        Money.of("500.00"),
        TransactionType.TRANSFER,
        "Transfer",
        timestamp,
        TransactionSource.MANUAL,
        accountId,
        destinationAccountId,
        null
    );

    AccountEntity account = mock(AccountEntity.class);
    AccountEntity destinationAccount = mock(AccountEntity.class);

    when(entityManager.getReference(AccountEntity.class, accountId))
        .thenReturn(account);

    when(
        entityManager.getReference(
            AccountEntity.class,
            destinationAccountId
        )
    ).thenReturn(destinationAccount);

    when(account.getId())
        .thenReturn(accountId);

    when(destinationAccount.getId())
        .thenReturn(destinationAccountId);

    TransactionEntity entity = mapper.toEntity(transaction);

    assertThat(entity.getAccountId())
        .isEqualTo(accountId);

    assertThat(entity.getDestinationAccountId())
        .isEqualTo(destinationAccountId);

    assertThat(entity.getCategoryId())
        .isNull();
  }

  @Test
  void shouldMapEntityToDomain() {
    UUID id = UUID.randomUUID();
    UUID accountId = UUID.randomUUID();
    UUID categoryId = UUID.randomUUID();
    Instant timestamp = Instant.parse("2026-01-15T12:00:00Z");
    Currency currency = Currency.getInstance("BRL");

    AccountEntity account = mock(AccountEntity.class);

    when(account.getId())
        .thenReturn(accountId);

    TransactionEntity entity = new TransactionEntity(
        id,
        Money.of("100.00", currency).amount(),
        currency,
        TransactionType.EXPENSE,
        "Supermarket",
        timestamp,
        TransactionSource.MANUAL,
        account,
        null,
        categoryId
    );

    Transaction transaction = mapper.toDomain(entity);

    assertThat(transaction.getId())
        .isEqualTo(id);

    assertThat(transaction.getAmount())
        .isEqualTo(Money.of("100.00", currency));

    assertThat(transaction.getType())
        .isEqualTo(TransactionType.EXPENSE);

    assertThat(transaction.getDescription())
        .isEqualTo("Supermarket");

    assertThat(transaction.getTimestamp())
        .isEqualTo(timestamp);

    assertThat(transaction.getSource())
        .isEqualTo(TransactionSource.MANUAL);

    assertThat(transaction.getAccountId())
        .isEqualTo(accountId);

    assertThat(transaction.getDestinationAccountId())
        .isNull();

    assertThat(transaction.getCategoryId())
        .isEqualTo(categoryId);
  }

  @Test
  void shouldMapTransferFromEntityToDomain() {
    UUID id = UUID.randomUUID();
    UUID accountId = UUID.randomUUID();
    UUID destinationAccountId = UUID.randomUUID();
    Instant timestamp = Instant.parse("2026-01-15T12:00:00Z");
    Currency currency = Currency.getInstance("BRL");

    AccountEntity account = mock(AccountEntity.class);
    AccountEntity destinationAccount = mock(AccountEntity.class);

    when(account.getId())
        .thenReturn(accountId);

    when(destinationAccount.getId())
        .thenReturn(destinationAccountId);

    TransactionEntity entity = new TransactionEntity(
        id,
        Money.of("500.00", currency).amount(),
        currency,
        TransactionType.TRANSFER,
        "Transfer",
        timestamp,
        TransactionSource.MANUAL,
        account,
        destinationAccount,
        null
    );

    Transaction transaction = mapper.toDomain(entity);

    assertThat(transaction.getId())
        .isEqualTo(id);

    assertThat(transaction.getAmount())
        .isEqualTo(Money.of("500.00", currency));

    assertThat(transaction.getType())
        .isEqualTo(TransactionType.TRANSFER);

    assertThat(transaction.getDescription())
        .isEqualTo("Transfer");

    assertThat(transaction.getTimestamp())
        .isEqualTo(timestamp);

    assertThat(transaction.getSource())
        .isEqualTo(TransactionSource.MANUAL);

    assertThat(transaction.getAccountId())
        .isEqualTo(accountId);

    assertThat(transaction.getDestinationAccountId())
        .isEqualTo(destinationAccountId);

    assertThat(transaction.getCategoryId())
        .isNull();
  }

  @Test
  void shouldPreserveCurrencyWhenMappingToDomain() {
    UUID id = UUID.randomUUID();
    UUID accountId = UUID.randomUUID();
    Instant timestamp = Instant.parse("2026-01-15T12:00:00Z");
    Currency currency = Currency.getInstance("USD");

    AccountEntity account = mock(AccountEntity.class);

    when(account.getId())
        .thenReturn(accountId);

    TransactionEntity entity = new TransactionEntity(
        id,
        Money.of("250.00", currency).amount(),
        currency,
        TransactionType.EXPENSE,
        "Purchase",
        timestamp,
        TransactionSource.MANUAL,
        account,
        null,
        null
    );

    Transaction transaction = mapper.toDomain(entity);

    assertThat(transaction.getAmount())
        .isEqualTo(Money.of("250.00", currency));
  }
}