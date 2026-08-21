package com.pedro.ledger.domain.transaction;

import com.pedro.ledger.domain.money.Money;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TransactionTest {

  private static final UUID ACCOUNT_ID = UUID.randomUUID();
  private static final UUID DESTINATION_ACCOUNT_ID = UUID.randomUUID();
  private static final Instant TIMESTAMP =
      Instant.parse("2026-08-21T12:00:00Z");

  @Test
  void shouldCreateManualExpense() {
    Transaction transaction = Transaction.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "Supermarket",
        TIMESTAMP,
        TransactionSource.MANUAL,
        ACCOUNT_ID,
        null,
        null
    );

    assertThat(transaction.getId()).isNotNull();
    assertThat(transaction.getAmount()).isEqualTo(Money.of("100.00"));
    assertThat(transaction.getType()).isEqualTo(TransactionType.EXPENSE);
    assertThat(transaction.getDescription()).isEqualTo("Supermarket");
    assertThat(transaction.getTimestamp()).isEqualTo(TIMESTAMP);
    assertThat(transaction.getSource()).isEqualTo(TransactionSource.MANUAL);
    assertThat(transaction.getAccountId()).isEqualTo(ACCOUNT_ID);
    assertThat(transaction.getDestinationAccountId()).isNull();
    assertThat(transaction.getCategoryId()).isNull();
  }

  @Test
  void shouldCreateIncome() {
    Transaction transaction = Transaction.create(
        Money.of("5000.00"),
        TransactionType.INCOME,
        "Salary",
        TIMESTAMP,
        TransactionSource.MANUAL,
        ACCOUNT_ID,
        null,
        null
    );

    assertThat(transaction.getType()).isEqualTo(TransactionType.INCOME);
  }

  @Test
  void shouldCreateTransfer() {
    Transaction transaction = Transaction.create(
        Money.of("500.00"),
        TransactionType.TRANSFER,
        "Transfer between accounts",
        TIMESTAMP,
        TransactionSource.MANUAL,
        ACCOUNT_ID,
        DESTINATION_ACCOUNT_ID,
        null
    );

    assertThat(transaction.getType()).isEqualTo(TransactionType.TRANSFER);
    assertThat(transaction.getAccountId()).isEqualTo(ACCOUNT_ID);
    assertThat(transaction.getDestinationAccountId())
        .isEqualTo(DESTINATION_ACCOUNT_ID);
    assertThat(transaction.getCategoryId()).isNull();
  }

  @Test
  void shouldRejectNullAmount() {
    assertThatThrownBy(() ->
        Transaction.create(
            null,
            TransactionType.EXPENSE,
            "Supermarket",
            TIMESTAMP,
            TransactionSource.MANUAL,
            ACCOUNT_ID,
            null,
            null
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Transaction amount cannot be null");
  }

  @Test
  void shouldRejectZeroAmount() {
    assertThatThrownBy(() ->
        Transaction.create(
            Money.of("0.00"),
            TransactionType.EXPENSE,
            "Supermarket",
            TIMESTAMP,
            TransactionSource.MANUAL,
            ACCOUNT_ID,
            null,
            null
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Transaction amount must be greater than zero");
  }

  @Test
  void shouldRejectNegativeAmount() {
    assertThatThrownBy(() ->
        Transaction.create(
            Money.of("-10.00"),
            TransactionType.EXPENSE,
            "Supermarket",
            TIMESTAMP,
            TransactionSource.MANUAL,
            ACCOUNT_ID,
            null,
            null
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Transaction amount must be greater than zero");
  }

  @Test
  void shouldRejectNullAccountId() {
    assertThatThrownBy(() ->
        Transaction.create(
            Money.of("100.00"),
            TransactionType.EXPENSE,
            "Supermarket",
            TIMESTAMP,
            TransactionSource.MANUAL,
            null,
            null,
            null
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Transaction account ID cannot be null");
  }

  @Test
  void shouldRejectTransferWithoutDestinationAccount() {
    assertThatThrownBy(() ->
        Transaction.create(
            Money.of("500.00"),
            TransactionType.TRANSFER,
            "Transfer",
            TIMESTAMP,
            TransactionSource.MANUAL,
            ACCOUNT_ID,
            null,
            null
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Transfer destination account ID cannot be null");
  }

  @Test
  void shouldRejectDestinationAccountForNonTransfer() {
    assertThatThrownBy(() ->
        Transaction.create(
            Money.of("100.00"),
            TransactionType.EXPENSE,
            "Supermarket",
            TIMESTAMP,
            TransactionSource.MANUAL,
            ACCOUNT_ID,
            DESTINATION_ACCOUNT_ID,
            null
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Only transfers can have a destination account");
  }

  @Test
  void shouldAllowManualTransactionAmountChange() {
    Transaction transaction = Transaction.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "Supermarket",
        TIMESTAMP,
        TransactionSource.MANUAL,
        ACCOUNT_ID,
        null,
        null
    );

    transaction.changeAmount(Money.of("150.00"));

    assertThat(transaction.getAmount()).isEqualTo(Money.of("150.00"));
  }

  @Test
  void shouldRejectAmountChangeForOpenFinanceTransaction() {
    Transaction transaction = Transaction.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "Supermarket",
        TIMESTAMP,
        TransactionSource.OPEN_FINANCE,
        ACCOUNT_ID,
        null,
        null
    );

    assertThatThrownBy(() ->
        transaction.changeAmount(Money.of("150.00"))
    )
        .isInstanceOf(IllegalStateException.class)
        .hasMessage(
            "Open Finance transactions cannot have their amount changed"
        );
  }

  @Test
  void shouldAllowDescriptionChangeForOpenFinanceTransaction() {
    Transaction transaction = Transaction.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "Original description",
        TIMESTAMP,
        TransactionSource.OPEN_FINANCE,
        ACCOUNT_ID,
        null,
        null
    );

    transaction.changeDescription("Updated description");

    assertThat(transaction.getDescription())
        .isEqualTo("Updated description");
  }

  @Test
  void shouldAllowNullDescription() {
    Transaction transaction = Transaction.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        null,
        TIMESTAMP,
        TransactionSource.MANUAL,
        ACCOUNT_ID,
        null,
        null
    );

    assertThat(transaction.getDescription()).isNull();
  }

  @Test
  void shouldNormalizeBlankDescriptionToNull() {
    Transaction transaction = Transaction.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "   ",
        TIMESTAMP,
        TransactionSource.MANUAL,
        ACCOUNT_ID,
        null,
        null
    );

    assertThat(transaction.getDescription()).isNull();
  }

  @Test
  void shouldTrimDescription() {
    Transaction transaction = Transaction.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "  Supermarket  ",
        TIMESTAMP,
        TransactionSource.MANUAL,
        ACCOUNT_ID,
        null,
        null
    );

    assertThat(transaction.getDescription()).isEqualTo("Supermarket");
  }

  @Test
  void shouldRejectTransferBetweenSameAccount() {
    UUID accountId = UUID.randomUUID();

    assertThatThrownBy(() ->
        Transaction.create(
            Money.of("100.00"),
            TransactionType.TRANSFER,
            null,
            TIMESTAMP,
            TransactionSource.MANUAL,
            accountId,
            accountId,
            null
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage(
            "Transfer source and destination accounts must be different"
        );
  }

  @Test
  void shouldCreateExpenseWithCategory() {
    UUID categoryId = UUID.randomUUID();

    Transaction transaction = Transaction.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "Supermarket",
        TIMESTAMP,
        TransactionSource.MANUAL,
        ACCOUNT_ID,
        null,
        categoryId
    );

    assertThat(transaction.getCategoryId())
        .isEqualTo(categoryId);
  }

  @Test
  void shouldCreateIncomeWithCategory() {
    UUID categoryId = UUID.randomUUID();

    Transaction transaction = Transaction.create(
        Money.of("5000.00"),
        TransactionType.INCOME,
        "Salary",
        TIMESTAMP,
        TransactionSource.MANUAL,
        ACCOUNT_ID,
        null,
        categoryId
    );

    assertThat(transaction.getCategoryId())
        .isEqualTo(categoryId);
  }

  @Test
  void shouldCreateTransactionWithoutCategory() {
    Transaction transaction = Transaction.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "Supermarket",
        TIMESTAMP,
        TransactionSource.MANUAL,
        ACCOUNT_ID,
        null,
        null
    );

    assertThat(transaction.getCategoryId()).isNull();
  }

  @Test
  void shouldRejectCategoryOnTransfer() {
    UUID categoryId = UUID.randomUUID();

    assertThatThrownBy(() ->
        Transaction.create(
            Money.of("100.00"),
            TransactionType.TRANSFER,
            null,
            TIMESTAMP,
            TransactionSource.MANUAL,
            ACCOUNT_ID,
            DESTINATION_ACCOUNT_ID,
            categoryId
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage(
            "Transfer transactions cannot have a category"
        );
  }

  @Test
  void shouldChangeCategory() {
    Transaction transaction = Transaction.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "Supermarket",
        TIMESTAMP,
        TransactionSource.MANUAL,
        ACCOUNT_ID,
        null,
        null
    );

    UUID categoryId = UUID.randomUUID();

    transaction.changeCategory(categoryId);

    assertThat(transaction.getCategoryId())
        .isEqualTo(categoryId);
  }

  @Test
  void shouldRemoveCategory() {
    UUID categoryId = UUID.randomUUID();

    Transaction transaction = Transaction.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "Supermarket",
        TIMESTAMP,
        TransactionSource.MANUAL,
        ACCOUNT_ID,
        null,
        categoryId
    );

    transaction.changeCategory(null);

    assertThat(transaction.getCategoryId())
        .isNull();
  }

  @Test
  void shouldRejectCategoryChangeOnTransfer() {
    Transaction transaction = Transaction.create(
        Money.of("100.00"),
        TransactionType.TRANSFER,
        null,
        TIMESTAMP,
        TransactionSource.MANUAL,
        ACCOUNT_ID,
        DESTINATION_ACCOUNT_ID,
        null
    );

    UUID categoryId = UUID.randomUUID();

    assertThatThrownBy(() ->
        transaction.changeCategory(categoryId)
    )
        .isInstanceOf(IllegalStateException.class)
        .hasMessage(
            "Transfer transactions cannot have a category"
        );
  }
}