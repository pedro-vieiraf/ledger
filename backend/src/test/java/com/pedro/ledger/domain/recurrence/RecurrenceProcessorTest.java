package com.pedro.ledger.domain.recurrence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountType;
import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.domain.transaction.TransactionType;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RecurrenceProcessorTest {

  private static final UUID CATEGORY_ID = UUID.randomUUID();

  private static final Instant TIMESTAMP =
      Instant.parse("2026-08-21T00:00:00Z");

  @Test
  void shouldProcessDueExpense() {
    Account account = Account.open(
        "Checking Account",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    Recurrence recurrence = Recurrence.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "Netflix",
        account.getId(),
        CATEGORY_ID,
        RecurrenceFrequency.MONTHLY,
        LocalDate.of(2026, 8, 21)
    );

    Transaction transaction = RecurrenceProcessor.process(
        recurrence,
        account,
        TIMESTAMP
    );

    assertThat(transaction.getAmount())
        .isEqualTo(Money.of("100.00"));

    assertThat(transaction.getType())
        .isEqualTo(TransactionType.EXPENSE);

    assertThat(transaction.getDescription())
        .isEqualTo("Netflix");

    assertThat(transaction.getAccountId())
        .isEqualTo(account.getId());

    assertThat(transaction.getCategoryId())
        .isEqualTo(CATEGORY_ID);

    assertThat(account.getBalance())
        .isEqualTo(Money.of("900.00"));
  }

  @Test
  void shouldProcessDueIncome() {
    Account account = Account.open(
        "Checking Account",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    Recurrence recurrence = Recurrence.create(
        Money.of("5000.00"),
        TransactionType.INCOME,
        "Salary",
        account.getId(),
        CATEGORY_ID,
        RecurrenceFrequency.MONTHLY,
        LocalDate.of(2026, 8, 21)
    );

    Transaction transaction = RecurrenceProcessor.process(
        recurrence,
        account,
        TIMESTAMP
    );

    assertThat(transaction.getAmount())
        .isEqualTo(Money.of("5000.00"));

    assertThat(transaction.getType())
        .isEqualTo(TransactionType.INCOME);

    assertThat(account.getBalance())
        .isEqualTo(Money.of("6000.00"));
  }

  @Test
  void shouldAdvanceRecurrenceAfterProcessing() {
    Account account = Account.open(
        "Checking Account",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    Recurrence recurrence = Recurrence.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "Netflix",
        account.getId(),
        CATEGORY_ID,
        RecurrenceFrequency.MONTHLY,
        LocalDate.of(2026, 8, 21)
    );

    RecurrenceProcessor.process(
        recurrence,
        account,
        TIMESTAMP
    );

    assertThat(recurrence.getNextOccurrence())
        .isEqualTo(LocalDate.of(2026, 9, 21));
  }

  @Test
  void shouldNotProcessFutureRecurrence() {
    Account account = Account.open(
        "Checking Account",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    Recurrence recurrence = Recurrence.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "Netflix",
        account.getId(),
        CATEGORY_ID,
        RecurrenceFrequency.MONTHLY,
        LocalDate.of(2026, 8, 22)
    );

    assertThatThrownBy(() ->
        RecurrenceProcessor.process(
            recurrence,
            account,
            TIMESTAMP
        )
    )
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("Recurrence is not due yet");

    assertThat(account.getBalance())
        .isEqualTo(Money.of("1000.00"));

    assertThat(recurrence.getNextOccurrence())
        .isEqualTo(LocalDate.of(2026, 8, 22));
  }

  @Test
  void shouldNotProcessInactiveRecurrence() {
    Account account = Account.open(
        "Checking Account",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    Recurrence recurrence = Recurrence.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "Netflix",
        account.getId(),
        CATEGORY_ID,
        RecurrenceFrequency.MONTHLY,
        LocalDate.of(2026, 8, 21)
    );

    recurrence.deactivate();

    assertThatThrownBy(() ->
        RecurrenceProcessor.process(
            recurrence,
            account,
            TIMESTAMP
        )
    )
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("Recurrence is inactive");

    assertThat(account.getBalance())
        .isEqualTo(Money.of("1000.00"));
  }

  @Test
  void shouldRejectNullRecurrence() {
    Account account = Account.open(
        "Checking Account",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    assertThatThrownBy(() ->
        RecurrenceProcessor.process(
            null,
            account,
            TIMESTAMP
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Recurrence cannot be null");
  }

  @Test
  void shouldRejectNullAccount() {
    Recurrence recurrence = Recurrence.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "Netflix",
        UUID.randomUUID(),
        CATEGORY_ID,
        RecurrenceFrequency.MONTHLY,
        LocalDate.of(2026, 8, 21)
    );

    assertThatThrownBy(() ->
        RecurrenceProcessor.process(
            recurrence,
            null,
            TIMESTAMP
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Account cannot be null");
  }

  @Test
  void shouldRejectNullTimestamp() {
    Account account = Account.open(
        "Checking Account",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    Recurrence recurrence = Recurrence.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "Netflix",
        account.getId(),
        CATEGORY_ID,
        RecurrenceFrequency.MONTHLY,
        LocalDate.of(2026, 8, 21)
    );

    assertThatThrownBy(() ->
        RecurrenceProcessor.process(
            recurrence,
            account,
            null
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Transaction timestamp cannot be null");
  }
}