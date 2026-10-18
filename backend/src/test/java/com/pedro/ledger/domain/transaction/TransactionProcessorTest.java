package com.pedro.ledger.domain.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountInactiveException;
import com.pedro.ledger.domain.account.AccountType;
import com.pedro.ledger.domain.money.CurrencyMismatchException;
import com.pedro.ledger.domain.money.Money;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

class TransactionProcessorTest {

  @Nested
  class Process {

    @Test
    void shouldDebitAccountWhenProcessingExpense() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

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

      TransactionProcessor.process(transaction, account);

      assertThat(account.getBalance())
          .isEqualTo(Money.of("900.00"));
    }

    @Test
    void shouldCreditAccountWhenProcessingIncome() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("500.00"),
          TransactionType.INCOME,
          "Salary",
          Instant.now(),
          TransactionSource.MANUAL,
          account.getId(),
          null,
          null
      );

      TransactionProcessor.process(transaction, account);

      assertThat(account.getBalance())
          .isEqualTo(Money.of("1500.00"));
    }

    @Test
    void shouldRejectTransferWhenProcessingSingleAccount() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      UUID destinationAccountId = UUID.randomUUID();

      Transaction transaction = Transaction.create(
          Money.of("200.00"),
          TransactionType.TRANSFER,
          "Transfer",
          Instant.now(),
          TransactionSource.MANUAL,
          account.getId(),
          destinationAccountId,
          null
      );

      assertThatThrownBy(() ->
          TransactionProcessor.process(transaction, account)
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Transfer requires a destination account");

      assertThat(account.getBalance())
          .isEqualTo(Money.of("1000.00"));
    }

    @Test
    void shouldRejectNullTransaction() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      assertThatThrownBy(() ->
          TransactionProcessor.process(null, account)
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Transaction cannot be null");
    }

    @Test
    void shouldRejectNullAccount() {
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

      assertThatThrownBy(() ->
          TransactionProcessor.process(transaction, null)
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Account cannot be null");
    }

    @Test
    void shouldRejectAccountThatDoesNotMatchTransaction() {
      Account transactionAccount = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account otherAccount = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("100.00"),
          TransactionType.EXPENSE,
          "Groceries",
          Instant.now(),
          TransactionSource.MANUAL,
          transactionAccount.getId(),
          null,
          null
      );

      assertThatThrownBy(() ->
          TransactionProcessor.process(transaction, otherAccount)
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Account does not match transaction");

      assertThat(transactionAccount.getBalance())
          .isEqualTo(Money.of("1000.00"));

      assertThat(otherAccount.getBalance())
          .isEqualTo(Money.of("500.00"));
    }

    @Test
    void shouldRejectInactiveAccount() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      account.deactivate();

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

      assertThatThrownBy(() ->
          TransactionProcessor.process(transaction, account)
      )
          .isInstanceOf(AccountInactiveException.class)
          .hasMessage("Account is inactive");

      assertThat(account.getBalance())
          .isEqualTo(Money.of("1000.00"));
    }
  }

  @Nested
  class ProcessTransfer {

    @Test
    void shouldDebitSourceAndCreditDestination() {
      Account source = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account destination = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("200.00"),
          TransactionType.TRANSFER,
          "Transfer to savings",
          Instant.now(),
          TransactionSource.MANUAL,
          source.getId(),
          destination.getId(),
          null
      );

      TransactionProcessor.process(
          transaction,
          source,
          destination
      );

      assertThat(source.getBalance())
          .isEqualTo(Money.of("800.00"));

      assertThat(destination.getBalance())
          .isEqualTo(Money.of("700.00"));
    }

    @Test
    void shouldRejectNullTransaction() {
      Account source = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account destination = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      assertThatThrownBy(() ->
          TransactionProcessor.process(
              null,
              source,
              destination
          )
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Transaction cannot be null");
    }

    @Test
    void shouldRejectNullSource() {
      Account destination = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      assertThatThrownBy(() ->
          TransactionProcessor.process(
              null,
              null,
              destination
          )
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Transaction cannot be null");
    }

    @Test
    void shouldRejectNullDestination() {
      Account source = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("200.00"),
          TransactionType.TRANSFER,
          "Transfer",
          Instant.now(),
          TransactionSource.MANUAL,
          source.getId(),
          UUID.randomUUID(),
          null
      );

      assertThatThrownBy(() ->
          TransactionProcessor.process(
              transaction,
              source,
              null
          )
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Destination account cannot be null");
    }

    @Test
    void shouldRejectSourceThatDoesNotMatchTransaction() {
      Account transactionSource = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account otherSource = Account.open(
          "Other Account",
          AccountType.CHECKING,
          Money.of("800.00")
      );

      Account destination = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("200.00"),
          TransactionType.TRANSFER,
          "Transfer",
          Instant.now(),
          TransactionSource.MANUAL,
          transactionSource.getId(),
          destination.getId(),
          null
      );

      assertThatThrownBy(() ->
          TransactionProcessor.process(
              transaction,
              otherSource,
              destination
          )
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Account does not match transaction");
    }

    @Test
    void shouldRejectDestinationThatDoesNotMatchTransaction() {
      Account source = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account transactionDestination = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      Account otherDestination = Account.open(
          "Other Account",
          AccountType.SAVINGS,
          Money.of("300.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("200.00"),
          TransactionType.TRANSFER,
          "Transfer",
          Instant.now(),
          TransactionSource.MANUAL,
          source.getId(),
          transactionDestination.getId(),
          null
      );

      assertThatThrownBy(() ->
          TransactionProcessor.process(
              transaction,
              source,
              otherDestination
          )
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Destination account does not match transaction");

      assertThat(source.getBalance())
          .isEqualTo(Money.of("1000.00"));

      assertThat(otherDestination.getBalance())
          .isEqualTo(Money.of("300.00"));
    }

    @Test
    void shouldRejectNonTransferTransaction() {
      Account source = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account destination = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("100.00"),
          TransactionType.EXPENSE,
          "Groceries",
          Instant.now(),
          TransactionSource.MANUAL,
          source.getId(),
          null,
          null
      );

      assertThatThrownBy(() ->
          TransactionProcessor.process(
              transaction,
              source,
              destination
          )
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Only transfers can have a destination account");
    }

    @Test
    void shouldRejectInactiveSourceAccount() {
      Account source = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account destination = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      source.deactivate();

      Transaction transaction = Transaction.create(
          Money.of("200.00"),
          TransactionType.TRANSFER,
          "Transfer",
          Instant.now(),
          TransactionSource.MANUAL,
          source.getId(),
          destination.getId(),
          null
      );

      assertThatThrownBy(() ->
          TransactionProcessor.process(
              transaction,
              source,
              destination
          )
      )
          .isInstanceOf(AccountInactiveException.class)
          .hasMessage("Account is inactive");

      assertThat(source.getBalance())
          .isEqualTo(Money.of("1000.00"));

      assertThat(destination.getBalance())
          .isEqualTo(Money.of("500.00"));
    }

    @Test
    void shouldRejectInactiveDestinationAccount() {
      Account source = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account destination = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      destination.deactivate();

      Transaction transaction = Transaction.create(
          Money.of("200.00"),
          TransactionType.TRANSFER,
          "Transfer",
          Instant.now(),
          TransactionSource.MANUAL,
          source.getId(),
          destination.getId(),
          null
      );

      assertThatThrownBy(() ->
          TransactionProcessor.process(
              transaction,
              source,
              destination
          )
      )
          .isInstanceOf(AccountInactiveException.class)
          .hasMessage("Destination account is inactive");

      assertThat(source.getBalance())
          .isEqualTo(Money.of("1000.00"));

      assertThat(destination.getBalance())
          .isEqualTo(Money.of("500.00"));
    }
  }

  @Nested
  class ChangeAmount {

    @Test
    void shouldIncreaseExpenseAndDebitDifference() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

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

      account.debit(transaction.getAmount());

      TransactionProcessor.changeAmount(
          transaction,
          Money.of("150.00"),
          account
      );

      assertThat(transaction.getAmount())
          .isEqualTo(Money.of("150.00"));

      assertThat(account.getBalance())
          .isEqualTo(Money.of("850.00"));
    }

    @Test
    void shouldDecreaseExpenseAndCreditDifference() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("150.00"),
          TransactionType.EXPENSE,
          "Groceries",
          Instant.now(),
          TransactionSource.MANUAL,
          account.getId(),
          null,
          null
      );

      account.debit(transaction.getAmount());

      TransactionProcessor.changeAmount(
          transaction,
          Money.of("100.00"),
          account
      );

      assertThat(transaction.getAmount())
          .isEqualTo(Money.of("100.00"));

      assertThat(account.getBalance())
          .isEqualTo(Money.of("900.00"));
    }

    @Test
    void shouldIncreaseIncomeAndCreditDifference() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("500.00"),
          TransactionType.INCOME,
          "Salary",
          Instant.now(),
          TransactionSource.MANUAL,
          account.getId(),
          null,
          null
      );

      account.credit(transaction.getAmount());

      TransactionProcessor.changeAmount(
          transaction,
          Money.of("700.00"),
          account
      );

      assertThat(transaction.getAmount())
          .isEqualTo(Money.of("700.00"));

      assertThat(account.getBalance())
          .isEqualTo(Money.of("1700.00"));
    }

    @Test
    void shouldDecreaseIncomeAndDebitDifference() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("700.00"),
          TransactionType.INCOME,
          "Salary",
          Instant.now(),
          TransactionSource.MANUAL,
          account.getId(),
          null,
          null
      );

      account.credit(transaction.getAmount());

      TransactionProcessor.changeAmount(
          transaction,
          Money.of("500.00"),
          account
      );

      assertThat(transaction.getAmount())
          .isEqualTo(Money.of("500.00"));

      assertThat(account.getBalance())
          .isEqualTo(Money.of("1500.00"));
    }

    @Test
    void shouldDoNothingWhenAmountDoesNotChange() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

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

      account.debit(transaction.getAmount());

      TransactionProcessor.changeAmount(
          transaction,
          Money.of("100.00"),
          account
      );

      assertThat(transaction.getAmount())
          .isEqualTo(Money.of("100.00"));

      assertThat(account.getBalance())
          .isEqualTo(Money.of("900.00"));
    }

    @Test
    void shouldRejectTransferAmountChange() {
      Account source = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account destination = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("200.00"),
          TransactionType.TRANSFER,
          "Transfer",
          Instant.now(),
          TransactionSource.MANUAL,
          source.getId(),
          destination.getId(),
          null
      );

      assertThatThrownBy(() ->
          TransactionProcessor.changeAmount(
              transaction,
              Money.of("300.00"),
              source
          )
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage(
              "Transfer amount changes require both accounts"
          );

      assertThat(transaction.getAmount())
          .isEqualTo(Money.of("200.00"));

      assertThat(source.getBalance())
          .isEqualTo(Money.of("1000.00"));
    }

    @Test
    void shouldRejectAmountChangeWhenAccountDoesNotMatch() {
      Account transactionAccount = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account otherAccount = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("100.00"),
          TransactionType.EXPENSE,
          "Groceries",
          Instant.now(),
          TransactionSource.MANUAL,
          transactionAccount.getId(),
          null,
          null
      );

      assertThatThrownBy(() ->
          TransactionProcessor.changeAmount(
              transaction,
              Money.of("150.00"),
              otherAccount
          )
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Account does not match transaction");

      assertThat(transaction.getAmount())
          .isEqualTo(Money.of("100.00"));
    }

    @Test
    void shouldRejectAmountChangeForInactiveAccount() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

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

      account.debit(transaction.getAmount());
      account.deactivate();

      assertThatThrownBy(() ->
          TransactionProcessor.changeAmount(
              transaction,
              Money.of("150.00"),
              account
          )
      )
          .isInstanceOf(AccountInactiveException.class)
          .hasMessage("Account is inactive");

      assertThat(transaction.getAmount())
          .isEqualTo(Money.of("100.00"));

      assertThat(account.getBalance())
          .isEqualTo(Money.of("900.00"));
    }

    @Test
    void shouldRejectNullTransaction() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      assertThatThrownBy(() ->
          TransactionProcessor.changeAmount(
              null,
              Money.of("100.00"),
              account
          )
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Transaction cannot be null");
    }

    @Test
    void shouldRejectNullAccount() {
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

      assertThatThrownBy(() ->
          TransactionProcessor.changeAmount(
              transaction,
              Money.of("150.00"),
              null
          )
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Account cannot be null");
    }

    @Test
    void shouldRejectOpenFinanceTransaction() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("100.00"),
          TransactionType.EXPENSE,
          "Imported transaction",
          Instant.now(),
          TransactionSource.OPEN_FINANCE,
          account.getId(),
          null,
          null
      );

      account.debit(transaction.getAmount());

      assertThatThrownBy(() ->
          TransactionProcessor.changeAmount(
              transaction,
              Money.of("150.00"),
              account
          )
      )
          .isInstanceOf(IllegalStateException.class);

      assertThat(transaction.getAmount())
          .isEqualTo(Money.of("100.00"));

      assertThat(account.getBalance())
          .isEqualTo(Money.of("900.00"));
    }
  }

  @Nested
  class Reverse {

    @Test
    void shouldReverseExpenseAndRestoreAccountBalance() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

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

      account.debit(transaction.getAmount());

      TransactionProcessor.reverse(transaction, account);

      assertThat(account.getBalance())
          .isEqualTo(Money.of("1000.00"));
    }

    @Test
    void shouldReverseIncomeAndRestoreAccountBalance() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("500.00"),
          TransactionType.INCOME,
          "Salary",
          Instant.now(),
          TransactionSource.MANUAL,
          account.getId(),
          null,
          null
      );

      account.credit(transaction.getAmount());

      TransactionProcessor.reverse(transaction, account);

      assertThat(account.getBalance())
          .isEqualTo(Money.of("1000.00"));
    }

    @Test
    void shouldRejectTransferWhenReversingSingleAccount() {
      Account source = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account destination = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("200.00"),
          TransactionType.TRANSFER,
          "Transfer",
          Instant.now(),
          TransactionSource.MANUAL,
          source.getId(),
          destination.getId(),
          null
      );

      assertThatThrownBy(() ->
          TransactionProcessor.reverse(transaction, source)
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Transfer requires source and destination accounts");
    }

    @Test
    void shouldRejectNullTransaction() {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      assertThatThrownBy(() ->
          TransactionProcessor.reverse(null, account)
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Transaction cannot be null");
    }

    @Test
    void shouldRejectNullAccount() {
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

      assertThatThrownBy(() ->
          TransactionProcessor.reverse(transaction, null)
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Account cannot be null");
    }

    @Test
    void shouldRejectAccountThatDoesNotMatchTransaction() {
      Account transactionAccount = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account otherAccount = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("100.00"),
          TransactionType.EXPENSE,
          "Groceries",
          Instant.now(),
          TransactionSource.MANUAL,
          transactionAccount.getId(),
          null,
          null
      );

      assertThatThrownBy(() ->
          TransactionProcessor.reverse(transaction, otherAccount)
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Account does not match transaction");
    }
  }

  @Nested
  class ReverseTransfer {

    @Test
    void shouldReverseTransferAndRestoreBothBalances() {
      Account source = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account destination = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("200.00"),
          TransactionType.TRANSFER,
          "Transfer",
          Instant.now(),
          TransactionSource.MANUAL,
          source.getId(),
          destination.getId(),
          null
      );

      source.debit(transaction.getAmount());
      destination.credit(transaction.getAmount());

      TransactionProcessor.reverse(
          transaction,
          source,
          destination
      );

      assertThat(source.getBalance())
          .isEqualTo(Money.of("1000.00"));

      assertThat(destination.getBalance())
          .isEqualTo(Money.of("500.00"));
    }

    @Test
    void shouldRejectNullTransaction() {
      Account source = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account destination = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      assertThatThrownBy(() ->
          TransactionProcessor.reverse(
              null,
              source,
              destination
          )
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Transaction cannot be null");
    }

    @Test
    void shouldRejectNullSource() {
      Account destination = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("200.00"),
          TransactionType.TRANSFER,
          "Transfer",
          Instant.now(),
          TransactionSource.MANUAL,
          UUID.randomUUID(),
          destination.getId(),
          null
      );

      assertThatThrownBy(() ->
          TransactionProcessor.reverse(
              transaction,
              null,
              destination
          )
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Account cannot be null");
    }

    @Test
    void shouldRejectNullDestination() {
      Account source = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("200.00"),
          TransactionType.TRANSFER,
          "Transfer",
          Instant.now(),
          TransactionSource.MANUAL,
          source.getId(),
          UUID.randomUUID(),
          null
      );

      assertThatThrownBy(() ->
          TransactionProcessor.reverse(
              transaction,
              source,
              null
          )
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Account cannot be null");
    }

    @Test
    void shouldRejectNonTransferTransaction() {
      Account source = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account destination = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("100.00"),
          TransactionType.EXPENSE,
          "Groceries",
          Instant.now(),
          TransactionSource.MANUAL,
          source.getId(),
          null,
          null
      );

      assertThatThrownBy(() ->
          TransactionProcessor.reverse(
              transaction,
              source,
              destination
          )
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Transaction is not a transfer");
    }

    @Test
    void shouldRejectSourceThatDoesNotMatchTransaction() {
      Account transactionSource = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account otherSource = Account.open(
          "Other Account",
          AccountType.CHECKING,
          Money.of("800.00")
      );

      Account destination = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("200.00"),
          TransactionType.TRANSFER,
          "Transfer",
          Instant.now(),
          TransactionSource.MANUAL,
          transactionSource.getId(),
          destination.getId(),
          null
      );

      assertThatThrownBy(() ->
          TransactionProcessor.reverse(
              transaction,
              otherSource,
              destination
          )
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Account does not match transaction");
    }

    @Test
    void shouldRejectDestinationThatDoesNotMatchTransaction() {
      Account source = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account transactionDestination = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("500.00")
      );

      Account otherDestination = Account.open(
          "Other Account",
          AccountType.SAVINGS,
          Money.of("300.00")
      );

      Transaction transaction = Transaction.create(
          Money.of("200.00"),
          TransactionType.TRANSFER,
          "Transfer",
          Instant.now(),
          TransactionSource.MANUAL,
          source.getId(),
          transactionDestination.getId(),
          null
      );

      assertThatThrownBy(() ->
          TransactionProcessor.reverse(
              transaction,
              source,
              otherDestination
          )
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Destination account does not match transaction");

      assertThat(source.getBalance())
          .isEqualTo(Money.of("1000.00"));

      assertThat(otherDestination.getBalance())
          .isEqualTo(Money.of("300.00"));
    }
  }

  @Test
  void shouldRejectExpenseWhenCurrencyDoesNotMatchAccount() {
    Account account = Account.open(
        "Checking Account",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    Transaction transaction = Transaction.create(
        Money.of(
            "100.00",
            java.util.Currency.getInstance("USD")
        ),
        TransactionType.EXPENSE,
        "Groceries",
        Instant.now(),
        TransactionSource.MANUAL,
        account.getId(),
        null,
        null
    );

    assertThatThrownBy(() ->
        TransactionProcessor.process(transaction, account)
    )
        .isInstanceOf(CurrencyMismatchException.class)
        .hasMessage("Currency mismatch: expected USD but got BRL");

    assertThat(account.getBalance())
        .isEqualTo(Money.of("1000.00"));
  }

  @Test
  void shouldRejectIncomeWhenCurrencyDoesNotMatchAccount() {
    Account account = Account.open(
        "Checking Account",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    Transaction transaction = Transaction.create(
        Money.of(
            "500.00",
            java.util.Currency.getInstance("USD")
        ),
        TransactionType.INCOME,
        "Salary",
        Instant.now(),
        TransactionSource.MANUAL,
        account.getId(),
        null,
        null
    );

    assertThatThrownBy(() ->
        TransactionProcessor.process(transaction, account)
    )
        .isInstanceOf(CurrencyMismatchException.class)
        .hasMessage("Currency mismatch: expected USD but got BRL");

    assertThat(account.getBalance())
        .isEqualTo(Money.of("1000.00"));
  }

  @Test
  void shouldRejectTransferWhenSourceCurrencyDoesNotMatch() {
    Account source = Account.open(
        "Checking Account",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    Account destination = Account.open(
        "Savings Account",
        AccountType.SAVINGS,
        Money.of("500.00")
    );

    Transaction transaction = Transaction.create(
        Money.of(
            "200.00",
            java.util.Currency.getInstance("USD")
        ),
        TransactionType.TRANSFER,
        "Transfer",
        Instant.now(),
        TransactionSource.MANUAL,
        source.getId(),
        destination.getId(),
        null
    );

    assertThatThrownBy(() ->
        TransactionProcessor.process(
            transaction,
            source,
            destination
        )
    )
        .isInstanceOf(CurrencyMismatchException.class)
        .hasMessage("Currency mismatch: expected USD but got BRL");

    assertThat(source.getBalance())
        .isEqualTo(Money.of("1000.00"));

    assertThat(destination.getBalance())
        .isEqualTo(Money.of("500.00"));
  }

  @Test
  void shouldRejectTransferWhenDestinationCurrencyDoesNotMatch() {
    Account source = Account.open(
        "Checking Account",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    Account destination = Account.open(
        "Dollar Account",
        AccountType.SAVINGS,
        Money.of(
            "500.00",
            java.util.Currency.getInstance("USD")
        )
    );

    Transaction transaction = Transaction.create(
        Money.of("200.00"),
        TransactionType.TRANSFER,
        "Transfer",
        Instant.now(),
        TransactionSource.MANUAL,
        source.getId(),
        destination.getId(),
        null
    );

    assertThatThrownBy(() ->
        TransactionProcessor.process(
            transaction,
            source,
            destination
        )
    )
        .isInstanceOf(CurrencyMismatchException.class)
        .hasMessage("Currency mismatch: expected BRL but got USD");

    assertThat(source.getBalance())
        .isEqualTo(Money.of("1000.00"));

    assertThat(destination.getBalance())
        .isEqualTo(
            Money.of(
                "500.00",
                java.util.Currency.getInstance("USD")
            )
        );
  }
}