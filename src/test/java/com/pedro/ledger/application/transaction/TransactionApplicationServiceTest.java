package com.pedro.ledger.application.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.domain.transaction.TransactionRepository;
import com.pedro.ledger.domain.transaction.TransactionSource;
import com.pedro.ledger.domain.transaction.TransactionType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

class TransactionApplicationServiceTest {

  @Mock
  private TransactionRepository transactionRepository;

  private TransactionApplicationService transactionApplicationService;

  @BeforeEach
  void setUp() {
    MockitoAnnotations.openMocks(this);
    transactionApplicationService =
        new TransactionApplicationService(transactionRepository);
  }

  @Nested
  class Create {

    @Test
    void shouldCreateManualTransaction() {
      UUID accountId = UUID.randomUUID();
      Money amount = Money.of("100.00");

      when(transactionRepository.save(any(Transaction.class)))
          .thenAnswer(invocation -> invocation.getArgument(0));

      Transaction result = transactionApplicationService.create(
          amount,
          TransactionType.EXPENSE,
          "Groceries",
          accountId,
          null,
          null
      );

      assertThat(result.getAmount())
          .isEqualTo(amount);

      assertThat(result.getType())
          .isEqualTo(TransactionType.EXPENSE);

      assertThat(result.getDescription())
          .isEqualTo("Groceries");

      assertThat(result.getSource())
          .isEqualTo(TransactionSource.MANUAL);

      assertThat(result.getAccountId())
          .isEqualTo(accountId);

      assertThat(result.getTimestamp())
          .isNotNull();

      verify(transactionRepository)
          .save(any(Transaction.class));
    }
  }

  @Nested
  class FindAll {

    @Test
    void shouldFindAllTransactions() {
      UUID accountId = UUID.randomUUID();

      Transaction transaction1 = Transaction.create(
          Money.of("100.00"),
          TransactionType.EXPENSE,
          "Groceries",
          Instant.now(),
          TransactionSource.MANUAL,
          accountId,
          null,
          null
      );

      Transaction transaction2 = Transaction.create(
          Money.of("2500.00"),
          TransactionType.INCOME,
          "Salary",
          Instant.now(),
          TransactionSource.MANUAL,
          accountId,
          null,
          null
      );

      List<Transaction> transactions = List.of(
          transaction1,
          transaction2
      );

      when(transactionRepository.findAll())
          .thenReturn(transactions);

      List<Transaction> result =
          transactionApplicationService.findAll();

      assertThat(result)
          .hasSize(2)
          .containsExactly(transaction1, transaction2);

      verify(transactionRepository)
          .findAll();
    }

    @Test
    void shouldReturnEmptyListWhenThereAreNoTransactions() {
      when(transactionRepository.findAll())
          .thenReturn(List.of());

      List<Transaction> result =
          transactionApplicationService.findAll();

      assertThat(result)
          .isEmpty();

      verify(transactionRepository)
          .findAll();
    }
  }

  @Nested
  class FindById {

    @Test
    void shouldFindTransactionById() {
      UUID transactionId = UUID.randomUUID();
      UUID accountId = UUID.randomUUID();

      Transaction transaction = Transaction.create(
          Money.of("100.00"),
          TransactionType.EXPENSE,
          "Groceries",
          Instant.now(),
          TransactionSource.MANUAL,
          accountId,
          null,
          null
      );

      when(transactionRepository.findById(transactionId))
          .thenReturn(Optional.of(transaction));

      Optional<Transaction> result =
          transactionApplicationService.findById(transactionId);

      assertThat(result)
          .isPresent()
          .contains(transaction);

      verify(transactionRepository)
          .findById(transactionId);
    }

    @Test
    void shouldReturnEmptyWhenTransactionDoesNotExist() {
      UUID transactionId = UUID.randomUUID();

      when(transactionRepository.findById(transactionId))
          .thenReturn(Optional.empty());

      Optional<Transaction> result =
          transactionApplicationService.findById(transactionId);

      assertThat(result)
          .isEmpty();

      verify(transactionRepository)
          .findById(transactionId);
    }
  }

  @Nested
  class Update {

    @Test
    void shouldUpdateTransaction() {
      UUID transactionId = UUID.randomUUID();
      UUID accountId = UUID.randomUUID();
      UUID categoryId = UUID.randomUUID();
      UUID newCategoryId = UUID.randomUUID();

      Transaction transaction = Transaction.create(
          Money.of("100.00"),
          TransactionType.EXPENSE,
          "Groceries",
          Instant.now(),
          TransactionSource.MANUAL,
          accountId,
          null,
          categoryId
      );

      when(transactionRepository.findById(transactionId))
          .thenReturn(Optional.of(transaction));

      when(transactionRepository.save(any(Transaction.class)))
          .thenAnswer(invocation -> invocation.getArgument(0));

      Transaction result = transactionApplicationService.update(
          transactionId,
          Money.of("150.00"),
          "Groceries and household items",
          newCategoryId
      );

      assertThat(result.getId())
          .isEqualTo(transaction.getId());

      assertThat(result.getAmount())
          .isEqualTo(Money.of("150.00"));

      assertThat(result.getDescription())
          .isEqualTo("Groceries and household items");

      assertThat(result.getCategoryId())
          .isEqualTo(newCategoryId);

      assertThat(result.getType())
          .isEqualTo(TransactionType.EXPENSE);

      assertThat(result.getAccountId())
          .isEqualTo(accountId);

      verify(transactionRepository)
          .findById(transactionId);

      verify(transactionRepository)
          .save(transaction);
    }

    @Test
    void shouldThrowExceptionWhenTransactionDoesNotExist() {
      UUID transactionId = UUID.randomUUID();

      when(transactionRepository.findById(transactionId))
          .thenReturn(Optional.empty());

      assertThatThrownBy(() ->
          transactionApplicationService.update(
              transactionId,
              Money.of("150.00"),
              "Updated description",
              UUID.randomUUID()
          )
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Transaction not found");

      verify(transactionRepository)
          .findById(transactionId);

      verify(transactionRepository, never())
          .save(any(Transaction.class));
    }
  }

  @Nested
  class Delete {

    @Test
    void shouldDeleteTransaction() {
      UUID transactionId = UUID.randomUUID();

      Transaction transaction = Transaction.create(
          Money.of("100.00"),
          TransactionType.EXPENSE,
          "Groceries",
          Instant.now(),
          TransactionSource.MANUAL,
          UUID.randomUUID(),
          null,
          null
      );

      when(transactionRepository.findById(transactionId))
          .thenReturn(Optional.of(transaction));

      transactionApplicationService.delete(transactionId);

      verify(transactionRepository)
          .findById(transactionId);

      verify(transactionRepository)
          .delete(transactionId);
    }

    @Test
    void shouldThrowExceptionWhenTransactionDoesNotExist() {
      UUID transactionId = UUID.randomUUID();

      when(transactionRepository.findById(transactionId))
          .thenReturn(Optional.empty());

      assertThatThrownBy(() ->
          transactionApplicationService.delete(transactionId)
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Transaction not found");

      verify(transactionRepository)
          .findById(transactionId);

      verify(transactionRepository, never())
          .delete(any(UUID.class));
    }
  }
}