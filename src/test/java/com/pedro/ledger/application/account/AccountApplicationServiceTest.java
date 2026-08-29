package com.pedro.ledger.application.account;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountRepository;
import com.pedro.ledger.domain.account.AccountType;
import com.pedro.ledger.domain.money.Money;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AccountApplicationServiceTest {

  @Mock
  private AccountRepository accountRepository;

  @InjectMocks
  private AccountApplicationService accountApplicationService;

  @Test
  void shouldCreateAndSaveAccount() {
    Account account = Account.open(
        "Checking Account",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    when(accountRepository.save(any(Account.class)))
        .thenReturn(account);

    Account result = accountApplicationService.create(
        "Checking Account",
        AccountType.CHECKING,
        new BigDecimal("1000.00")
    );

    assertThat(result)
        .isEqualTo(account);

    verify(accountRepository)
        .save(any(Account.class));
  }

  @Test
  void shouldCreateAccountWithCorrectData() {
    when(accountRepository.save(any(Account.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    Account result = accountApplicationService.create(
        "Savings Account",
        AccountType.SAVINGS,
        new BigDecimal("2500.00")
    );

    assertThat(result.getId())
        .isNotNull();

    assertThat(result.getName())
        .isEqualTo("Savings Account");

    assertThat(result.getType())
        .isEqualTo(AccountType.SAVINGS);

    assertThat(result.getBalance())
        .isEqualTo(Money.of("2500.00"));

    assertThat(result.isActive())
        .isTrue();

    verify(accountRepository)
        .save(any(Account.class));
  }

  @Test
  void shouldPropagateDomainValidationError() {
    assertThatThrownBy(() ->
        accountApplicationService.create(
            "   ",
            AccountType.CHECKING,
            new BigDecimal("1000.00")
        )
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Account name cannot be null or blank");
  }
}