package com.pedro.ledger.application.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountRepository;
import com.pedro.ledger.domain.account.AccountType;
import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.domain.transaction.TransactionNotFoundException;
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

  @Mock
  private AccountRepository accountRepository;

  private TransactionApplicationService transactionApplicationService;

  @BeforeEach
  void setUp() {
    MockitoAnnotations.openMocks(this);

    transactionApplicationService =
        new TransactionApplicationService(
            transactionRepository,
            accountRepository
        );
  }

  @Nested
  class Create {

    @Test
    void shouldCreateExpenseAndDebitAccount() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      UUID accountId = account.getId();

      when(accountRepository.findById(accountId))
          .thenReturn(Optional.of(account));

      when(transactionRepository.save(any(Transaction.class)))
          .thenAnswer(invocation -> invocation.getArgument(0));

      Transaction result = transactionApplicationService.create(
          Money.of("100.00"),
          TransactionType.EXPENSE,
          "Groceries",
          accountId,
          null,
          null
      );

      assertThat(result.getAmount())
          .isEqualTo(Money.of("100.00"));

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

      assertThat(account.getBalance())
          .isEqualTo(Money.of("900.00"));

      verify(accountRepository)
          .findById(accountId);

      verify(accountRepository)
          .save(account);

      verify(transactionRepository)
          .save(any(Transaction.class));
    }

    @Test
    void shouldCreateIncomeAndCreditAccount() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      UUID accountId = account.getId();

      when(accountRepository.findById(accountId))
          .thenReturn(Optional.of(account));

      when(transactionRepository.save(any(Transaction.class)))
          .thenAnswer(invocation -> invocation.getArgument(0));

      Transaction result = transactionApplicationService.create(
          Money.of("2500.00"),
          TransactionType.INCOME,
          "Salary",
          accountId,
          null,
          null
      );

      assertThat(result.getAmount())
          .isEqualTo(Money.of("2500.00"));

      assertThat(result.getType())
          .isEqualTo(TransactionType.INCOME);

      assertThat(account.getBalance())
          .isEqualTo(Money.of("3500.00"));

      verify(accountRepository)
          .findById(accountId);

      verify(accountRepository)
          .save(account);

      verify(transactionRepository)
          .save(any(Transaction.class));
    }

    @Test
    void shouldCreateTransferAndUpdateBothAccounts() {
      Account sourceAccount = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account destinationAccount = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      UUID sourceAccountId = sourceAccount.getId();
      UUID destinationAccountId = destinationAccount.getId();

      when(accountRepository.findById(sourceAccountId))
          .thenReturn(Optional.of(sourceAccount));

      when(accountRepository.findById(destinationAccountId))
          .thenReturn(Optional.of(destinationAccount));

      when(transactionRepository.save(any(Transaction.class)))
          .thenAnswer(invocation -> invocation.getArgument(0));

      Transaction result = transactionApplicationService.create(
          Money.of("200.00"),
          TransactionType.TRANSFER,
          "Transfer to savings",
          sourceAccountId,
          destinationAccountId,
          null
      );

      assertThat(result.getType())
          .isEqualTo(TransactionType.TRANSFER);

      assertThat(result.getAccountId())
          .isEqualTo(sourceAccountId);

      assertThat(result.getDestinationAccountId())
          .isEqualTo(destinationAccountId);

      assertThat(sourceAccount.getBalance())
          .isEqualTo(Money.of("800.00"));

      assertThat(destinationAccount.getBalance())
          .isEqualTo(Money.of("700.00"));

      verify(accountRepository)
          .findById(sourceAccountId);

      verify(accountRepository)
          .findById(destinationAccountId);

      verify(accountRepository)
          .save(sourceAccount);

      verify(accountRepository)
          .save(destinationAccount);

      verify(transactionRepository)
          .save(any(Transaction.class));
    }

    @Test
    void shouldThrowExceptionWhenAccountDoesNotExist() {
      UUID accountId = UUID.randomUUID();

      when(accountRepository.findById(accountId))
          .thenReturn(Optional.empty());

      assertThatThrownBy(() ->
          transactionApplicationService.create(
              Money.of("100.00"),
              TransactionType.EXPENSE,
              "Groceries",
              accountId,
              null,
              null
          )
      )
          .isInstanceOf(RuntimeException.class);

      verify(accountRepository)
          .findById(accountId);

      verify(accountRepository, never())
          .save(any(Account.class));

      verify(transactionRepository, never())
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
    void shouldUpdateExpenseAndAdjustAccountBalance() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      UUID accountId = account.getId();
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

      UUID transactionId = transaction.getId();

      when(transactionRepository.findById(transactionId))
          .thenReturn(Optional.of(transaction));

      when(accountRepository.findById(accountId))
          .thenReturn(Optional.of(account));

      when(transactionRepository.save(any(Transaction.class)))
          .thenAnswer(invocation -> invocation.getArgument(0));

      Transaction result = transactionApplicationService.update(
          transactionId,
          Money.of("150.00"),
          "Groceries and household items",
          newCategoryId
      );

      assertThat(result.getId())
          .isEqualTo(transactionId);

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

      assertThat(account.getBalance())
          .isEqualTo(Money.of("850.00"));

      verify(transactionRepository)
          .findById(transactionId);

      verify(accountRepository)
          .findById(accountId);

      verify(accountRepository)
          .save(account);

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
          .isInstanceOf(TransactionNotFoundException.class);

      verify(transactionRepository)
          .findById(transactionId);

      verify(accountRepository, never())
          .findById(any(UUID.class));

      verify(transactionRepository, never())
          .save(any(Transaction.class));

      verify(accountRepository, never())
          .save(any(Account.class));
    }
  }

  @Nested
  class Delete {

    @Test
    void shouldDeleteExpenseAndRestoreAccountBalance() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      UUID accountId = account.getId();

      account.debit(Money.of("100.00"));

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

      UUID transactionId = transaction.getId();

      when(transactionRepository.findById(transactionId))
          .thenReturn(Optional.of(transaction));

      when(accountRepository.findById(accountId))
          .thenReturn(Optional.of(account));

      transactionApplicationService.delete(transactionId);

      assertThat(account.getBalance())
          .isEqualTo(Money.of("1000.00"));

      verify(transactionRepository)
          .findById(transactionId);

      verify(accountRepository)
          .findById(accountId);

      verify(accountRepository)
          .save(account);

      verify(transactionRepository)
          .delete(transactionId);
    }

    @Test
    void shouldDeleteIncomeAndRestoreAccountBalance() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      UUID accountId = account.getId();

      account.credit(Money.of("100.00"));

      Transaction transaction = Transaction.create(
          Money.of("100.00"),
          TransactionType.INCOME,
          "Salary",
          Instant.now(),
          TransactionSource.MANUAL,
          accountId,
          null,
          null
      );

      UUID transactionId = transaction.getId();

      when(transactionRepository.findById(transactionId))
          .thenReturn(Optional.of(transaction));

      when(accountRepository.findById(accountId))
          .thenReturn(Optional.of(account));

      transactionApplicationService.delete(transactionId);

      assertThat(account.getBalance())
          .isEqualTo(Money.of("1000.00"));

      verify(accountRepository)
          .findById(accountId);

      verify(accountRepository)
          .save(account);

      verify(transactionRepository)
          .delete(transactionId);
    }

    @Test
    void shouldDeleteTransferAndRestoreBothAccountBalances() {
      Account sourceAccount = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account destinationAccount = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      UUID sourceAccountId = sourceAccount.getId();
      UUID destinationAccountId = destinationAccount.getId();

      sourceAccount.debit(Money.of("200.00"));
      destinationAccount.credit(Money.of("200.00"));

      Transaction transaction = Transaction.create(
          Money.of("200.00"),
          TransactionType.TRANSFER,
          "Transfer to savings",
          Instant.now(),
          TransactionSource.MANUAL,
          sourceAccountId,
          destinationAccountId,
          null
      );

      UUID transactionId = transaction.getId();

      when(transactionRepository.findById(transactionId))
          .thenReturn(Optional.of(transaction));

      when(accountRepository.findById(sourceAccountId))
          .thenReturn(Optional.of(sourceAccount));

      when(accountRepository.findById(destinationAccountId))
          .thenReturn(Optional.of(destinationAccount));

      transactionApplicationService.delete(transactionId);

      assertThat(sourceAccount.getBalance())
          .isEqualTo(Money.of("1000.00"));

      assertThat(destinationAccount.getBalance())
          .isEqualTo(Money.of("500.00"));

      verify(accountRepository)
          .findById(sourceAccountId);

      verify(accountRepository)
          .findById(destinationAccountId);

      verify(accountRepository)
          .save(sourceAccount);

      verify(accountRepository)
          .save(destinationAccount);

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
          .isInstanceOf(TransactionNotFoundException.class);

      verify(transactionRepository)
          .findById(transactionId);

      verify(accountRepository, never())
          .findById(any(UUID.class));

      verify(accountRepository, never())
          .save(any(Account.class));

      verify(transactionRepository, never())
          .delete(any(UUID.class));
    }
  }
}