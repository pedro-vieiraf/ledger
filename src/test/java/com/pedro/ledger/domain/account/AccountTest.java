package com.pedro.ledger.domain.account;

import com.pedro.ledger.domain.money.Money;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
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
}