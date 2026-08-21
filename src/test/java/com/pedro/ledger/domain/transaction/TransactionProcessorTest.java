package com.pedro.ledger.domain.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountType;
import com.pedro.ledger.domain.money.Money;
import java.time.Instant;
import java.util.UUID;
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
        destination.getId()
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
        null
    );

    assertThatThrownBy(() ->
        TransactionProcessor.process(transaction, account)
    )
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("Account is inactive");
  }
}