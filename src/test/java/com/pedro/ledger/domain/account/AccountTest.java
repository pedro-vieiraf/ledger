package com.pedro.ledger.domain.account;

import com.pedro.ledger.domain.money.CurrencyMismatchException;
import com.pedro.ledger.domain.money.Money;
import java.util.Currency;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AccountTest {

  @Test
  void shouldCreateAccountWithOpeningBalance() {
    Money openingBalance = Money.of("1000.00");

    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        openingBalance
    );

    assertThat(account.getId()).isNotNull();
    assertThat(account.getName()).isEqualTo("Nubank");
    assertThat(account.getType()).isEqualTo(AccountType.CHECKING);
    assertThat(account.getStatus()).isEqualTo(AccountStatus.ACTIVE);
    assertThat(account.getBalance()).isEqualTo(openingBalance);
  }

  @Test
  void shouldCreateAccountWithZeroOpeningBalance() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.zero()
    );

    assertThat(account.getBalance()).isEqualTo(Money.zero());
  }

  @Test
  void shouldRejectNullName() {
    assertThatThrownBy(() ->
        Account.open(
            null,
            AccountType.CHECKING,
            Money.zero()
        )
    )
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void shouldRejectBlankName() {
    assertThatThrownBy(() ->
        Account.open(
            "   ",
            AccountType.CHECKING,
            Money.zero()
        )
    )
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void shouldRejectNullAccountType() {
    assertThatThrownBy(() ->
        Account.open(
            "Nubank",
            null,
            Money.zero()
        )
    )
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void shouldRejectNullOpeningBalance() {
    assertThatThrownBy(() ->
        Account.open(
            "Nubank",
            AccountType.CHECKING,
            null
        )
    )
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void shouldCreditAccount() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    account.credit(Money.of("500.00"));

    assertThat(account.getBalance())
        .isEqualTo(Money.of("1500.00"));
  }

  @Test
  void shouldDebitAccount() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    account.debit(Money.of("300.00"));

    assertThat(account.getBalance())
        .isEqualTo(Money.of("700.00"));
  }

  @Test
  void shouldAllowNegativeBalance() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.of("100.00")
    );

    account.debit(Money.of("150.00"));

    assertThat(account.getBalance())
        .isEqualTo(Money.of("-50.00"));
  }

  @Test
  void shouldRejectNegativeCreditAmount() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    assertThatThrownBy(() ->
        account.credit(Money.of("-100.00"))
    )
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void shouldRejectZeroCreditAmount() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    assertThatThrownBy(() ->
        account.credit(Money.zero())
    )
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void shouldRejectNegativeDebitAmount() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    assertThatThrownBy(() ->
        account.debit(Money.of("-100.00"))
    )
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void shouldRejectZeroDebitAmount() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    assertThatThrownBy(() ->
        account.debit(Money.zero())
    )
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void shouldDeactivateAccount() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.zero()
    );

    account.deactivate();

    assertThat(account.getStatus())
        .isEqualTo(AccountStatus.INACTIVE);
  }

  @Test
  void shouldNotCreditInactiveAccount() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.zero()
    );

    account.deactivate();

    assertThatThrownBy(() ->
        account.credit(Money.of("100.00"))
    )
        .isInstanceOf(IllegalStateException.class);

    assertThat(account.getBalance())
        .isEqualTo(Money.zero());
  }

  @Test
  void shouldNotDebitInactiveAccount() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.of("100.00")
    );

    account.deactivate();

    assertThatThrownBy(() ->
        account.debit(Money.of("50.00"))
    )
        .isInstanceOf(IllegalStateException.class);

    assertThat(account.getBalance())
        .isEqualTo(Money.of("100.00"));
  }

  @Test
  void shouldNotAllowDeactivatingInactiveAccount() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.zero()
    );

    account.deactivate();

    assertThatThrownBy(account::deactivate)
        .isInstanceOf(IllegalStateException.class);
  }

  @Test
  void shouldRejectCreditOperationWithDifferentCurrency() {
    Currency brl = Currency.getInstance("BRL");
    Currency usd = Currency.getInstance("USD");

    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.of("1000.00", brl)
    );

    assertThatThrownBy(() ->
        account.credit(Money.of("100.00", usd))
    )
        .isInstanceOf(CurrencyMismatchException.class);
  }

  @Test
  void shouldRejectDebitOperationWithDifferentCurrency() {
    Currency brl = Currency.getInstance("BRL");
    Currency usd = Currency.getInstance("USD");

    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.of("1000.00", brl)
    );

    assertThatThrownBy(() ->
        account.debit(Money.of("100.00", usd))
    )
        .isInstanceOf(CurrencyMismatchException.class);
  }

  @Test
  void shouldActivateInactiveAccount() {
    Account account = Account.restore(
        UUID.randomUUID(),
        "Nubank",
        AccountType.CHECKING,
        AccountStatus.INACTIVE,
        Money.zero()
    );

    account.activate();

    assertThat(account.getStatus())
        .isEqualTo(AccountStatus.ACTIVE);
  }

  @Test
  void shouldNotActivateActiveAccount() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.zero()
    );

    assertThatThrownBy(account::activate)
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("Account is already active");
  }

  @Test
  void shouldAllowOperationsAfterAccountActivation() {
    Account account = Account.restore(
        UUID.randomUUID(),
        "Nubank",
        AccountType.CHECKING,
        AccountStatus.INACTIVE,
        Money.zero()
    );

    account.activate();
    account.credit(Money.of("100.00"));

    assertThat(account.getBalance())
        .isEqualTo(Money.of("100.00"));
  }

  @Test
  void shouldRenameAccount() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.zero()
    );

    account.rename("Inter");

    assertThat(account.getName())
        .isEqualTo("Inter");
  }

  @Test
  void shouldTrimNewAccountNameWhenRenaming() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.zero()
    );

    account.rename("  Banco Inter  ");

    assertThat(account.getName())
        .isEqualTo("Banco Inter");
  }

  @Test
  void shouldRejectNullNameWhenRenamingAccount() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.zero()
    );

    assertThatThrownBy(() -> account.rename(null))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Account name cannot be null or blank");
  }

  @Test
  void shouldRejectBlankNameWhenRenamingAccount() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.zero()
    );

    assertThatThrownBy(() -> account.rename("   "))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Account name cannot be null or blank");
  }

  @Test
  void shouldNotRenameInactiveAccount() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.zero()
    );

    account.deactivate();

    assertThatThrownBy(() -> account.rename("Inter"))
        .isInstanceOf(AccountInactiveException.class);

    assertThat(account.getName())
        .isEqualTo("Nubank");
  }

  @Test
  void shouldChangeAccountType() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.zero()
    );

    account.changeType(AccountType.SAVINGS);

    assertThat(account.getType())
        .isEqualTo(AccountType.SAVINGS);
  }

  @Test
  void shouldRejectNullTypeWhenChangingAccountType() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.zero()
    );

    assertThatThrownBy(() -> account.changeType(null))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Account type cannot be null");
  }

  @Test
  void shouldNotChangeTypeOfInactiveAccount() {
    Account account = Account.open(
        "Nubank",
        AccountType.CHECKING,
        Money.zero()
    );

    account.deactivate();

    assertThatThrownBy(() ->
        account.changeType(AccountType.SAVINGS)
    )
        .isInstanceOf(AccountInactiveException.class);

    assertThat(account.getType())
        .isEqualTo(AccountType.CHECKING);
  }

  @Test
  void shouldRestoreAccountWithPersistedData() {
    UUID id = UUID.randomUUID();
    Money balance = Money.of("1500.00");

    Account account = Account.restore(
        id,
        "Nubank",
        AccountType.CHECKING,
        AccountStatus.ACTIVE,
        balance
    );

    assertThat(account.getId())
        .isEqualTo(id);

    assertThat(account.getName())
        .isEqualTo("Nubank");

    assertThat(account.getType())
        .isEqualTo(AccountType.CHECKING);

    assertThat(account.getStatus())
        .isEqualTo(AccountStatus.ACTIVE);

    assertThat(account.getBalance())
        .isEqualTo(balance);
  }

  @Test
  void shouldRestoreInactiveAccount() {
    UUID id = UUID.randomUUID();
    Money balance = Money.of("1500.00");

    Account account = Account.restore(
        id,
        "Nubank",
        AccountType.CHECKING,
        AccountStatus.INACTIVE,
        balance
    );

    assertThat(account.getId())
        .isEqualTo(id);

    assertThat(account.getStatus())
        .isEqualTo(AccountStatus.INACTIVE);

    assertThat(account.getBalance())
        .isEqualTo(balance);
  }

  @Test
  void shouldRejectNullIdWhenRestoringAccount() {
    assertThatThrownBy(() ->
        Account.restore(
            null,
            "Nubank",
            AccountType.CHECKING,
            AccountStatus.ACTIVE,
            Money.zero()
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Account ID cannot be null");
  }

  @Test
  void shouldRejectNullNameWhenRestoringAccount() {
    assertThatThrownBy(() ->
        Account.restore(
            UUID.randomUUID(),
            null,
            AccountType.CHECKING,
            AccountStatus.ACTIVE,
            Money.zero()
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Account name cannot be null or blank");
  }

  @Test
  void shouldRejectBlankNameWhenRestoringAccount() {
    assertThatThrownBy(() ->
        Account.restore(
            UUID.randomUUID(),
            "   ",
            AccountType.CHECKING,
            AccountStatus.ACTIVE,
            Money.zero()
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Account name cannot be null or blank");
  }

  @Test
  void shouldRejectNullTypeWhenRestoringAccount() {
    assertThatThrownBy(() ->
        Account.restore(
            UUID.randomUUID(),
            "Nubank",
            null,
            AccountStatus.ACTIVE,
            Money.zero()
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Account type cannot be null");
  }

  @Test
  void shouldRejectNullStatusWhenRestoringAccount() {
    assertThatThrownBy(() ->
        Account.restore(
            UUID.randomUUID(),
            "Nubank",
            AccountType.CHECKING,
            null,
            Money.zero()
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Account status cannot be null");
  }

  @Test
  void shouldRejectNullBalanceWhenRestoringAccount() {
    assertThatThrownBy(() ->
        Account.restore(
            UUID.randomUUID(),
            "Nubank",
            AccountType.CHECKING,
            AccountStatus.ACTIVE,
            null
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Account balance cannot be null");
  }

  @Test
  void shouldPreserveCurrencyWhenRestoringAccount() {
    Currency usd = Currency.getInstance("USD");

    Account account = Account.restore(
        UUID.randomUUID(),
        "International Account",
        AccountType.CHECKING,
        AccountStatus.ACTIVE,
        Money.of("1000.00", usd)
    );

    assertThat(account.getBalance().currency())
        .isEqualTo(usd);
  }
}