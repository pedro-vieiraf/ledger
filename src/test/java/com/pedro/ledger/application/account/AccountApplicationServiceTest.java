package com.pedro.ledger.application.account;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountRepository;
import com.pedro.ledger.domain.account.AccountStatus;
import com.pedro.ledger.domain.account.AccountType;
import com.pedro.ledger.domain.money.Money;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Nested;
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

  @Nested
  class CreateAccount {

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

  @Nested
  class FindAccountById {

    @Test
    void shouldFindAccountById() {
      UUID id = UUID.randomUUID();

      Account account = Account.restore(
          id,
          "Checking Account",
          AccountType.CHECKING,
          AccountStatus.ACTIVE,
          Money.of("1000.00")
      );

      when(accountRepository.findById(id))
          .thenReturn(Optional.of(account));

      Optional<Account> result =
          accountApplicationService.findById(id);

      assertThat(result)
          .isPresent()
          .contains(account);

      verify(accountRepository)
          .findById(id);
    }

    @Test
    void shouldReturnEmptyWhenAccountDoesNotExist() {
      UUID id = UUID.randomUUID();

      when(accountRepository.findById(id))
          .thenReturn(Optional.empty());

      Optional<Account> result =
          accountApplicationService.findById(id);

      assertThat(result)
          .isEmpty();

      verify(accountRepository)
          .findById(id);
    }
  }

  @Nested
  class FindAllAccounts {

    @Test
    void shouldFindAllAccounts() {
      Account checkingAccount = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account savingsAccount = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("2500.00")
      );

      when(accountRepository.findAll())
          .thenReturn(List.of(
              checkingAccount,
              savingsAccount
          ));

      List<Account> result =
          accountApplicationService.findAll();

      assertThat(result)
          .containsExactly(
              checkingAccount,
              savingsAccount
          );

      verify(accountRepository)
          .findAll();
    }

    @Test
    void shouldReturnEmptyWhenThereAreNoAccounts() {
      when(accountRepository.findAll())
          .thenReturn(List.of());

      List<Account> result =
          accountApplicationService.findAll();

      assertThat(result)
          .isEmpty();

      verify(accountRepository)
          .findAll();
    }
  }

  @Nested
  class UpdateAccount {

    @Test
    void shouldUpdateNameAndType() {
      UUID id = UUID.randomUUID();

      Account account = Account.restore(
          id,
          "Old Name",
          AccountType.SAVINGS,
          AccountStatus.ACTIVE,
          Money.of("1000.00")
      );

      when(accountRepository.findById(id))
          .thenReturn(Optional.of(account));

      when(accountRepository.save(account))
          .thenReturn(account);

      Account result = accountApplicationService.update(
          id,
          "New Name",
          AccountType.CHECKING
      );

      assertThat(result.getId())
          .isEqualTo(id);

      assertThat(result.getName())
          .isEqualTo("New Name");

      assertThat(result.getType())
          .isEqualTo(AccountType.CHECKING);

      assertThat(result.getBalance())
          .isEqualTo(Money.of("1000.00"));

      assertThat(result.getStatus())
          .isEqualTo(AccountStatus.ACTIVE);

      verify(accountRepository)
          .findById(id);

      verify(accountRepository)
          .save(account);
    }

    @Test
    void shouldUpdateOnlyName() {
      UUID id = UUID.randomUUID();

      Account account = Account.restore(
          id,
          "Old Name",
          AccountType.CHECKING,
          AccountStatus.ACTIVE,
          Money.of("1000.00")
      );

      when(accountRepository.findById(id))
          .thenReturn(Optional.of(account));

      when(accountRepository.save(account))
          .thenReturn(account);

      Account result = accountApplicationService.update(
          id,
          "New Name",
          null
      );

      assertThat(result.getName())
          .isEqualTo("New Name");

      assertThat(result.getType())
          .isEqualTo(AccountType.CHECKING);

      assertThat(result.getBalance())
          .isEqualTo(Money.of("1000.00"));

      verify(accountRepository)
          .findById(id);

      verify(accountRepository)
          .save(account);
    }

    @Test
    void shouldUpdateOnlyType() {
      UUID id = UUID.randomUUID();

      Account account = Account.restore(
          id,
          "Checking Account",
          AccountType.SAVINGS,
          AccountStatus.ACTIVE,
          Money.of("1000.00")
      );

      when(accountRepository.findById(id))
          .thenReturn(Optional.of(account));

      when(accountRepository.save(account))
          .thenReturn(account);

      Account result = accountApplicationService.update(
          id,
          null,
          AccountType.CHECKING
      );

      assertThat(result.getName())
          .isEqualTo("Checking Account");

      assertThat(result.getType())
          .isEqualTo(AccountType.CHECKING);

      assertThat(result.getBalance())
          .isEqualTo(Money.of("1000.00"));

      verify(accountRepository)
          .findById(id);

      verify(accountRepository)
          .save(account);
    }

    @Test
    void shouldThrowWhenAccountDoesNotExist() {
      UUID id = UUID.randomUUID();

      when(accountRepository.findById(id))
          .thenReturn(Optional.empty());

      assertThatThrownBy(() ->
          accountApplicationService.update(
              id,
              "New Name",
              AccountType.CHECKING
          )
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Account not found");

      verify(accountRepository)
          .findById(id);

      verify(accountRepository, never())
          .save(any(Account.class));
    }

    @Test
    void shouldPropagateDomainValidationErrorWhenNameIsInvalid() {
      UUID id = UUID.randomUUID();

      Account account = Account.restore(
          id,
          "Checking Account",
          AccountType.CHECKING,
          AccountStatus.ACTIVE,
          Money.of("1000.00")
      );

      when(accountRepository.findById(id))
          .thenReturn(Optional.of(account));

      assertThatThrownBy(() ->
          accountApplicationService.update(
              id,
              "   ",
              null
          )
      )
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Account name cannot be null or blank");

      verify(accountRepository)
          .findById(id);

      verify(accountRepository, never())
          .save(any(Account.class));
    }
  }

  @Nested
  class Deactivate {

    @Test
    void shouldDeactivateAccount() {
      UUID id = UUID.randomUUID();

      Account account = Account.open(
          "Nubank",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      when(accountRepository.findById(id))
          .thenReturn(Optional.of(account));

      when(accountRepository.save(account))
          .thenReturn(account);

      accountApplicationService.deactivate(id);

      assertFalse(account.isActive());
      verify(accountRepository).findById(id);
      verify(accountRepository).save(account);
    }

    @Test
    void shouldThrowExceptionWhenAccountDoesNotExist() {
      UUID id = UUID.randomUUID();

      when(accountRepository.findById(id))
          .thenReturn(Optional.empty());

      assertThrows(
          IllegalArgumentException.class,
          () -> accountApplicationService.deactivate(id)
      );

      verify(accountRepository).findById(id);
      verify(accountRepository, never()).save(any());
    }
  }
}