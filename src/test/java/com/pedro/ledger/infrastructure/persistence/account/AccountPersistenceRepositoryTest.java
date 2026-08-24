package com.pedro.ledger.infrastructure.persistence.account;

import static org.assertj.core.api.Assertions.assertThat;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountStatus;
import com.pedro.ledger.domain.account.AccountType;
import com.pedro.ledger.domain.account.AccountRepository;
import com.pedro.ledger.domain.money.Money;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop"
})

@Testcontainers
@SpringBootTest
class AccountPersistenceRepositoryTest {

  @Container
  @ServiceConnection
  static PostgreSQLContainer postgres =
      new PostgreSQLContainer("postgres:17");

  @Autowired
  private AccountRepository accountRepository;

  @Test
  void shouldSaveAndFindAccount() {
    Account account = Account.open(
        "Checking Account",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    Account savedAccount = accountRepository.save(account);

    Optional<Account> foundAccount =
        accountRepository.findById(savedAccount.getId());

    assertThat(foundAccount)
        .isPresent();

    assertThat(foundAccount.get().getId())
        .isEqualTo(account.getId());

    assertThat(foundAccount.get().getName())
        .isEqualTo("Checking Account");

    assertThat(foundAccount.get().getType())
        .isEqualTo(AccountType.CHECKING);

    assertThat(foundAccount.get().getStatus())
        .isEqualTo(AccountStatus.ACTIVE);

    assertThat(foundAccount.get().getBalance())
        .isEqualTo(Money.of("1000.00"));
  }

  @Test
  void shouldReturnEmptyWhenAccountDoesNotExist() {
    UUID id = UUID.randomUUID();

    Optional<Account> foundAccount =
        accountRepository.findById(id);

    assertThat(foundAccount)
        .isEmpty();
  }

  @Test
  void shouldPersistInactiveAccount() {
    Account account = Account.open(
        "Savings Account",
        AccountType.SAVINGS,
        Money.of("2500.00")
    );

    account.deactivate();

    Account savedAccount =
        accountRepository.save(account);

    Optional<Account> foundAccount =
        accountRepository.findById(savedAccount.getId());

    assertThat(foundAccount)
        .isPresent();

    assertThat(foundAccount.get().getStatus())
        .isEqualTo(AccountStatus.INACTIVE);

    assertThat(foundAccount.get().getBalance())
        .isEqualTo(Money.of("2500.00"));
  }
}