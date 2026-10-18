package com.pedro.ledger.domain.recurrence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.transaction.TransactionType;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RecurrenceTest {

  private static final Money AMOUNT = Money.of("100.00");
  private static final UUID ACCOUNT_ID = UUID.randomUUID();
  private static final UUID CATEGORY_ID = UUID.randomUUID();

  @Test
  void shouldCreateMonthlyExpense() {
    LocalDate startDate = LocalDate.of(2026, 8, 21);

    Recurrence recurrence = Recurrence.create(
        AMOUNT,
        TransactionType.EXPENSE,
        "Netflix",
        ACCOUNT_ID,
        CATEGORY_ID,
        RecurrenceFrequency.MONTHLY,
        startDate
    );

    assertThat(recurrence.getId()).isNotNull();
    assertThat(recurrence.getAmount()).isEqualTo(AMOUNT);
    assertThat(recurrence.getType())
        .isEqualTo(TransactionType.EXPENSE);
    assertThat(recurrence.getDescription())
        .isEqualTo("Netflix");
    assertThat(recurrence.getAccountId())
        .isEqualTo(ACCOUNT_ID);
    assertThat(recurrence.getCategoryId())
        .isEqualTo(CATEGORY_ID);
    assertThat(recurrence.getFrequency())
        .isEqualTo(RecurrenceFrequency.MONTHLY);
    assertThat(recurrence.getStartDate())
        .isEqualTo(startDate);
    assertThat(recurrence.getStatus())
        .isEqualTo(RecurrenceStatus.ACTIVE);
    assertThat(recurrence.getNextOccurrence())
        .isEqualTo(startDate);
  }

  @Test
  void shouldCreateIncome() {
    Recurrence recurrence = Recurrence.create(
        Money.of("5000.00"),
        TransactionType.INCOME,
        "Salary",
        ACCOUNT_ID,
        null,
        RecurrenceFrequency.MONTHLY,
        LocalDate.of(2026, 8, 1)
    );

    assertThat(recurrence.getType())
        .isEqualTo(TransactionType.INCOME);
  }

  @Test
  void shouldAllowNullDescription() {
    Recurrence recurrence = Recurrence.create(
        AMOUNT,
        TransactionType.EXPENSE,
        null,
        ACCOUNT_ID,
        null,
        RecurrenceFrequency.MONTHLY,
        LocalDate.of(2026, 8, 21)
    );

    assertThat(recurrence.getDescription()).isNull();
  }

  @Test
  void shouldNormalizeBlankDescriptionToNull() {
    Recurrence recurrence = Recurrence.create(
        AMOUNT,
        TransactionType.EXPENSE,
        "   ",
        ACCOUNT_ID,
        null,
        RecurrenceFrequency.MONTHLY,
        LocalDate.of(2026, 8, 21)
    );

    assertThat(recurrence.getDescription()).isNull();
  }

  @Test
  void shouldTrimDescription() {
    Recurrence recurrence = Recurrence.create(
        AMOUNT,
        TransactionType.EXPENSE,
        "  Netflix  ",
        ACCOUNT_ID,
        null,
        RecurrenceFrequency.MONTHLY,
        LocalDate.of(2026, 8, 21)
    );

    assertThat(recurrence.getDescription())
        .isEqualTo("Netflix");
  }

  @Test
  void shouldRejectNullAmount() {
    assertThatThrownBy(() ->
        Recurrence.create(
            null,
            TransactionType.EXPENSE,
            "Netflix",
            ACCOUNT_ID,
            null,
            RecurrenceFrequency.MONTHLY,
            LocalDate.of(2026, 8, 21)
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Recurrence amount cannot be null");
  }

  @Test
  void shouldRejectZeroAmount() {
    assertThatThrownBy(() ->
        Recurrence.create(
            Money.of("0.00"),
            TransactionType.EXPENSE,
            "Netflix",
            ACCOUNT_ID,
            null,
            RecurrenceFrequency.MONTHLY,
            LocalDate.of(2026, 8, 21)
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Recurrence amount must be greater than zero");
  }

  @Test
  void shouldRejectNegativeAmount() {
    assertThatThrownBy(() ->
        Recurrence.create(
            Money.of("-100.00"),
            TransactionType.EXPENSE,
            "Netflix",
            ACCOUNT_ID,
            null,
            RecurrenceFrequency.MONTHLY,
            LocalDate.of(2026, 8, 21)
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Recurrence amount must be greater than zero");
  }

  @Test
  void shouldRejectNullType() {
    assertThatThrownBy(() ->
        Recurrence.create(
            AMOUNT,
            null,
            "Netflix",
            ACCOUNT_ID,
            null,
            RecurrenceFrequency.MONTHLY,
            LocalDate.of(2026, 8, 21)
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Recurrence type cannot be null");
  }

  @Test
  void shouldRejectTransferType() {
    assertThatThrownBy(() ->
        Recurrence.create(
            AMOUNT,
            TransactionType.TRANSFER,
            "Transfer",
            ACCOUNT_ID,
            null,
            RecurrenceFrequency.MONTHLY,
            LocalDate.of(2026, 8, 21)
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Recurrence cannot have transfer type");
  }

  @Test
  void shouldRejectNullAccountId() {
    assertThatThrownBy(() ->
        Recurrence.create(
            AMOUNT,
            TransactionType.EXPENSE,
            "Netflix",
            null,
            null,
            RecurrenceFrequency.MONTHLY,
            LocalDate.of(2026, 8, 21)
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Recurrence account ID cannot be null");
  }

  @Test
  void shouldRejectNullFrequency() {
    assertThatThrownBy(() ->
        Recurrence.create(
            AMOUNT,
            TransactionType.EXPENSE,
            "Netflix",
            ACCOUNT_ID,
            null,
            null,
            LocalDate.of(2026, 8, 21)
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Recurrence frequency cannot be null");
  }

  @Test
  void shouldRejectNullStartDate() {
    assertThatThrownBy(() ->
        Recurrence.create(
            AMOUNT,
            TransactionType.EXPENSE,
            "Netflix",
            ACCOUNT_ID,
            null,
            RecurrenceFrequency.MONTHLY,
            null
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Recurrence start date cannot be null");
  }

  @Test
  void shouldAdvanceDailyRecurrence() {
    LocalDate startDate = LocalDate.of(2026, 8, 21);

    Recurrence recurrence = Recurrence.create(
        AMOUNT,
        TransactionType.EXPENSE,
        "Daily expense",
        ACCOUNT_ID,
        null,
        RecurrenceFrequency.DAILY,
        startDate
    );

    recurrence.advanceToNextOccurrence();

    assertThat(recurrence.getNextOccurrence())
        .isEqualTo(LocalDate.of(2026, 8, 22));
  }

  @Test
  void shouldAdvanceWeeklyRecurrence() {
    LocalDate startDate = LocalDate.of(2026, 8, 21);

    Recurrence recurrence = Recurrence.create(
        AMOUNT,
        TransactionType.EXPENSE,
        "Weekly expense",
        ACCOUNT_ID,
        null,
        RecurrenceFrequency.WEEKLY,
        startDate
    );

    recurrence.advanceToNextOccurrence();

    assertThat(recurrence.getNextOccurrence())
        .isEqualTo(LocalDate.of(2026, 8, 28));
  }

  @Test
  void shouldAdvanceMonthlyRecurrence() {
    LocalDate startDate = LocalDate.of(2026, 8, 21);

    Recurrence recurrence = Recurrence.create(
        AMOUNT,
        TransactionType.EXPENSE,
        "Monthly expense",
        ACCOUNT_ID,
        null,
        RecurrenceFrequency.MONTHLY,
        startDate
    );

    recurrence.advanceToNextOccurrence();

    assertThat(recurrence.getNextOccurrence())
        .isEqualTo(LocalDate.of(2026, 9, 21));
  }

  @Test
  void shouldPreserveOriginalDayWhenMonthIsShorter() {
    LocalDate startDate = LocalDate.of(2026, 1, 31);

    Recurrence recurrence = Recurrence.create(
        AMOUNT,
        TransactionType.EXPENSE,
        "Monthly expense",
        ACCOUNT_ID,
        null,
        RecurrenceFrequency.MONTHLY,
        startDate
    );

    recurrence.advanceToNextOccurrence();

    assertThat(recurrence.getNextOccurrence())
        .isEqualTo(LocalDate.of(2026, 2, 28));

    recurrence.advanceToNextOccurrence();

    assertThat(recurrence.getNextOccurrence())
        .isEqualTo(LocalDate.of(2026, 3, 31));
  }

  @Test
  void shouldHandleThirtyDayMonth() {
    LocalDate startDate = LocalDate.of(2026, 3, 31);

    Recurrence recurrence = Recurrence.create(
        AMOUNT,
        TransactionType.EXPENSE,
        "Monthly expense",
        ACCOUNT_ID,
        null,
        RecurrenceFrequency.MONTHLY,
        startDate
    );

    recurrence.advanceToNextOccurrence();

    assertThat(recurrence.getNextOccurrence())
        .isEqualTo(LocalDate.of(2026, 4, 30));

    recurrence.advanceToNextOccurrence();

    assertThat(recurrence.getNextOccurrence())
        .isEqualTo(LocalDate.of(2026, 5, 31));
  }

  @Test
  void shouldAdvanceYearlyRecurrence() {
    LocalDate startDate = LocalDate.of(2026, 8, 21);

    Recurrence recurrence = Recurrence.create(
        AMOUNT,
        TransactionType.EXPENSE,
        "Yearly expense",
        ACCOUNT_ID,
        null,
        RecurrenceFrequency.YEARLY,
        startDate
    );

    recurrence.advanceToNextOccurrence();

    assertThat(recurrence.getNextOccurrence())
        .isEqualTo(LocalDate.of(2027, 8, 21));
  }

  @Test
  void shouldHandleLeapYearRecurrence() {
    LocalDate startDate = LocalDate.of(2028, 2, 29);

    Recurrence recurrence = Recurrence.create(
        AMOUNT,
        TransactionType.EXPENSE,
        "Yearly expense",
        ACCOUNT_ID,
        null,
        RecurrenceFrequency.YEARLY,
        startDate
    );

    recurrence.advanceToNextOccurrence();

    assertThat(recurrence.getNextOccurrence())
        .isEqualTo(LocalDate.of(2029, 2, 28));

    recurrence.advanceToNextOccurrence();

    assertThat(recurrence.getNextOccurrence())
        .isEqualTo(LocalDate.of(2030, 2, 28));

    recurrence.advanceToNextOccurrence();

    assertThat(recurrence.getNextOccurrence())
        .isEqualTo(LocalDate.of(2031, 2, 28));

    recurrence.advanceToNextOccurrence();

    assertThat(recurrence.getNextOccurrence())
        .isEqualTo(LocalDate.of(2032, 2, 29));
  }

  @Test
  void shouldDeactivateRecurrence() {
    Recurrence recurrence = Recurrence.create(
        AMOUNT,
        TransactionType.EXPENSE,
        "Netflix",
        ACCOUNT_ID,
        null,
        RecurrenceFrequency.MONTHLY,
        LocalDate.of(2026, 8, 21)
    );

    recurrence.deactivate();

    assertThat(recurrence.getStatus())
        .isEqualTo(RecurrenceStatus.INACTIVE);
  }

  @Test
  void shouldActivateInactiveRecurrence() {
    Recurrence recurrence = Recurrence.create(
        AMOUNT,
        TransactionType.EXPENSE,
        "Netflix",
        ACCOUNT_ID,
        null,
        RecurrenceFrequency.MONTHLY,
        LocalDate.of(2026, 8, 21)
    );

    recurrence.deactivate();
    recurrence.activate();

    assertThat(recurrence.getStatus())
        .isEqualTo(RecurrenceStatus.ACTIVE);
  }

  @Test
  void shouldRejectDeactivatingAlreadyInactiveRecurrence() {
    Recurrence recurrence = Recurrence.create(
        AMOUNT,
        TransactionType.EXPENSE,
        "Netflix",
        ACCOUNT_ID,
        null,
        RecurrenceFrequency.MONTHLY,
        LocalDate.of(2026, 8, 21)
    );

    recurrence.deactivate();

    assertThatThrownBy(recurrence::deactivate)
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("Recurrence is already inactive");
  }

  @Test
  void shouldRejectActivatingAlreadyActiveRecurrence() {
    Recurrence recurrence = Recurrence.create(
        AMOUNT,
        TransactionType.EXPENSE,
        "Netflix",
        ACCOUNT_ID,
        null,
        RecurrenceFrequency.MONTHLY,
        LocalDate.of(2026, 8, 21)
    );

    assertThatThrownBy(recurrence::activate)
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("Recurrence is already active");
  }

  @Test
  void shouldNotAdvanceInactiveRecurrence() {
    Recurrence recurrence = Recurrence.create(
        AMOUNT,
        TransactionType.EXPENSE,
        "Netflix",
        ACCOUNT_ID,
        null,
        RecurrenceFrequency.MONTHLY,
        LocalDate.of(2026, 8, 21)
    );

    recurrence.deactivate();

    assertThatThrownBy(recurrence::advanceToNextOccurrence)
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("Recurrence is inactive");
  }
}