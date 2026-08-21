package com.pedro.ledger.domain.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountType;
import com.pedro.ledger.domain.money.Money;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class TransactionProcessorTest {

  private static final Instant TIMESTAMP =
      Instant.parse("2026-08-21T12:00:00Z");

  @Test
  void shouldCreditAccountForIncome() {
    Account account = Account.open(
        "Checking Account",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    Transaction transaction = Transaction.create(
        Money.of("500.00"),
        TransactionType.INCOME,
        null,
        TIMESTAMP,
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
  void shouldDebitAccountForExpense() {
    Account account = Account.open(
        "Checking Account",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    Transaction transaction = Transaction.create(
        Money.of("300.00"),
        TransactionType.EXPENSE,
        null,
        TIMESTAMP,
        TransactionSource.MANUAL,
        account.getId(),
        null,
        null
    );

    TransactionProcessor.process(transaction, account);

    assertThat(account.getBalance())
        .isEqualTo(Money.of("700.00"));
  }

  @Test
  void shouldTransferMoneyBetweenAccounts() {
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
        Money.of("300.00"),
        TransactionType.TRANSFER,
        null,
        TIMESTAMP,
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
        .isEqualTo(Money.of("700.00"));

    assertThat(destination.getBalance())
        .isEqualTo(Money.of("800.00"));
  }

  @Test
  void shouldNotProcessExpenseOnInactiveAccount() {
    Account account = Account.open(
        "Checking Account",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    account.deactivate();

    Transaction transaction = Transaction.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        null,
        TIMESTAMP,
        TransactionSource.MANUAL,
        account.getId(),
        null,
        null
    );

    assertThatThrownBy(() ->
        TransactionProcessor.process(transaction, account)
    )
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("Account is inactive");
  }

  @Test
  void shouldNotTransferWhenDestinationAccountIsNull() {
    Account source = Account.open(
        "Checking Account",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    Transaction transaction = Transaction.create(
        Money.of("300.00"),
        TransactionType.TRANSFER,
        null,
        TIMESTAMP,
        TransactionSource.MANUAL,
        source.getId(),
        java.util.UUID.randomUUID(),
        null
    );

    assertThatThrownBy(() ->
        TransactionProcessor.process(transaction, source, null)
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Destination account cannot be null");

    assertThat(source.getBalance())
        .isEqualTo(Money.of("1000.00"));
  }

  @Test
  void shouldNotTransferWhenDestinationAccountDoesNotMatchTransaction() {
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

    Account wrongDestination = Account.open(
        "Other Account",
        AccountType.SAVINGS,
        Money.of("200.00")
    );

    Transaction transaction = Transaction.create(
        Money.of("300.00"),
        TransactionType.TRANSFER,
        null,
        TIMESTAMP,
        TransactionSource.MANUAL,
        source.getId(),
        destination.getId(),
        null
    );

    assertThatThrownBy(() ->
        TransactionProcessor.process(transaction, source, wrongDestination)
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Destination account does not match transaction");

    assertThat(source.getBalance())
        .isEqualTo(Money.of("1000.00"));
  }

  @Test
  void shouldNotTransferWhenDestinationAccountIsInactive() {
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
        Money.of("300.00"),
        TransactionType.TRANSFER,
        null,
        TIMESTAMP,
        TransactionSource.MANUAL,
        source.getId(),
        destination.getId(),
        null
    );

    assertThatThrownBy(() ->
        TransactionProcessor.process(transaction, source, destination)
    )
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("Destination account is inactive");

    assertThat(source.getBalance())
        .isEqualTo(Money.of("1000.00"));

    assertThat(destination.getBalance())
        .isEqualTo(Money.of("500.00"));
  }

  @Test
  void shouldNotTransferWhenSourceAccountDoesNotMatchTransaction() {
    Account source = Account.open(
        "Checking Account",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    Account wrongSource = Account.open(
        "Other Account",
        AccountType.CHECKING,
        Money.of("200.00")
    );

    Account destination = Account.open(
        "Savings Account",
        AccountType.SAVINGS,
        Money.of("500.00")
    );

    Transaction transaction = Transaction.create(
        Money.of("300.00"),
        TransactionType.TRANSFER,
        null,
        TIMESTAMP,
        TransactionSource.MANUAL,
        source.getId(),
        destination.getId(),
        null
    );

    assertThatThrownBy(() ->
        TransactionProcessor.process(transaction, wrongSource, destination)
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Account does not match transaction");

    assertThat(destination.getBalance())
        .isEqualTo(Money.of("500.00"));
  }
}