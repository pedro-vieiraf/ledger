package com.pedro.ledger.infrastructure.persistence.transaction;

import static org.assertj.core.api.Assertions.assertThat;

import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.domain.transaction.TransactionRepository;
import com.pedro.ledger.domain.transaction.TransactionSource;
import com.pedro.ledger.domain.transaction.TransactionType;
import com.pedro.ledger.infrastructure.persistence.account.AccountEntity;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Testcontainers
@SpringBootTest
class TransactionPersistenceRepositoryTest {

  @Container
  @ServiceConnection
  static PostgreSQLContainer postgres =
      new PostgreSQLContainer("postgres:17");

  @Autowired
  private TransactionRepository transactionRepository;

  @Autowired
  private EntityManager entityManager;

  private AccountEntity account;

  @BeforeEach
  void setUp() {
    account = new AccountEntity(
        UUID.randomUUID(),
        "Checking Account",
        com.pedro.ledger.domain.account.AccountType.CHECKING,
        com.pedro.ledger.domain.account.AccountStatus.ACTIVE,
        Money.of("1000.00").amount(),
        java.util.Currency.getInstance("BRL")
    );

    entityManager.persist(account);
    entityManager.flush();
  }

  @Nested
  class Save {

    @Test
    void shouldSaveTransaction() {
      Transaction transaction = Transaction.create(
          Money.of("100.00"),
          TransactionType.EXPENSE,
          "Groceries",
          Instant.now(),
          TransactionSource.MANUAL,
          account.getId(),
          null,
          null
      );

      Transaction saved = transactionRepository.save(transaction);

      assertThat(saved.getId())
          .isEqualTo(transaction.getId());

      assertThat(saved.getAmount())
          .isEqualTo(Money.of("100.00"));

      assertThat(saved.getType())
          .isEqualTo(TransactionType.EXPENSE);

      assertThat(saved.getDescription())
          .isEqualTo("Groceries");

      assertThat(saved.getSource())
          .isEqualTo(TransactionSource.MANUAL);

      assertThat(saved.getAccountId())
          .isEqualTo(account.getId());

      assertThat(saved.getDestinationAccountId())
          .isNull();

      assertThat(saved.getCategoryId())
          .isNull();
    }
  }

  @Nested
  class FindById {

    @Test
    void shouldFindTransactionById() {
      Transaction transaction = Transaction.create(
          Money.of("100.00"),
          TransactionType.EXPENSE,
          "Groceries",
          Instant.now(),
          TransactionSource.MANUAL,
          account.getId(),
          null,
          null
      );

      transactionRepository.save(transaction);

      var result = transactionRepository.findById(transaction.getId());

      assertThat(result)
          .isPresent();

      Transaction found = result.orElseThrow();

      assertThat(found.getId())
          .isEqualTo(transaction.getId());

      assertThat(found.getAmount())
          .isEqualTo(Money.of("100.00"));

      assertThat(found.getType())
          .isEqualTo(TransactionType.EXPENSE);

      assertThat(found.getDescription())
          .isEqualTo("Groceries");

      assertThat(found.getAccountId())
          .isEqualTo(account.getId());
    }

    @Test
    void shouldReturnEmptyWhenTransactionDoesNotExist() {
      UUID transactionId = UUID.randomUUID();

      var result = transactionRepository.findById(transactionId);

      assertThat(result)
          .isEmpty();
    }
  }

  @Nested
  class FindAll {

    @Test
    void shouldFindAllTransactions() {
      Transaction transaction1 = Transaction.create(
          Money.of("100.00"),
          TransactionType.EXPENSE,
          "Groceries",
          Instant.now(),
          TransactionSource.MANUAL,
          account.getId(),
          null,
          null
      );

      Transaction transaction2 = Transaction.create(
          Money.of("2500.00"),
          TransactionType.INCOME,
          "Salary",
          Instant.now(),
          TransactionSource.MANUAL,
          account.getId(),
          null,
          null
      );

      transactionRepository.save(transaction1);
      transactionRepository.save(transaction2);

      List<Transaction> result =
          transactionRepository.findAll();

      assertThat(result)
          .hasSize(2)
          .extracting(Transaction::getId)
          .containsExactlyInAnyOrder(
              transaction1.getId(),
              transaction2.getId()
          );
    }

    @Test
    void shouldReturnEmptyListWhenThereAreNoTransactions() {
      List<Transaction> result =
          transactionRepository.findAll();

      assertThat(result)
          .isEmpty();
    }
  }

  @Nested
  class DeleteById {

    @Test
    void shouldDeleteTransactionById() {
      Transaction transaction = Transaction.create(
          Money.of("100.00"),
          TransactionType.EXPENSE,
          "Groceries",
          Instant.now(),
          TransactionSource.MANUAL,
          account.getId(),
          null,
          null
      );

      transactionRepository.save(transaction);

      transactionRepository.delete(transaction.getId());

      var result =
          transactionRepository.findById(transaction.getId());

      assertThat(result)
          .isEmpty();
    }
  }
}