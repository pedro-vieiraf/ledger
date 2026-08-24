package com.pedro.ledger.infrastructure.persistence.account;

import static org.assertj.core.api.Assertions.assertThat;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountStatus;
import com.pedro.ledger.domain.account.AccountType;
import com.pedro.ledger.domain.money.Money;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AccountMapperTest {

  private AccountMapper mapper;

  @BeforeEach
  void setUp() {
    mapper = new AccountMapper();
  }

  @Test
  void shouldMapDomainToEntity() {
    Account account = Account.open(
        "Checking Account",
        AccountType.CHECKING,
        Money.of("1000.00")
    );

    AccountEntity entity = mapper.toEntity(account);

    assertThat(entity.getId())
        .isEqualTo(account.getId());

    assertThat(entity.getName())
        .isEqualTo(account.getName());

    assertThat(entity.getType())
        .isEqualTo(account.getType());

    assertThat(entity.getStatus())
        .isEqualTo(account.getStatus());

    assertThat(entity.getBalance())
        .isEqualByComparingTo(account.getBalance().amount());
  }

  @Test
  void shouldMapEntityToDomain() {
    UUID id = UUID.randomUUID();

    AccountEntity entity = new AccountEntity(
        id,
        "Checking Account",
        AccountType.CHECKING,
        AccountStatus.ACTIVE,
        Money.of("1000.00").amount()
    );

    Account account = mapper.toDomain(entity);

    assertThat(account.getId())
        .isEqualTo(id);

    assertThat(account.getName())
        .isEqualTo("Checking Account");

    assertThat(account.getType())
        .isEqualTo(AccountType.CHECKING);

    assertThat(account.getStatus())
        .isEqualTo(AccountStatus.ACTIVE);

    assertThat(account.getBalance())
        .isEqualTo(Money.of("1000.00"));
  }

  @Test
  void shouldPreserveInactiveAccountWhenMappingToDomain() {
    UUID id = UUID.randomUUID();

    AccountEntity entity = new AccountEntity(
        id,
        "Savings Account",
        AccountType.SAVINGS,
        AccountStatus.INACTIVE,
        Money.of("2500.00").amount()
    );

    Account account = mapper.toDomain(entity);

    assertThat(account.getId())
        .isEqualTo(id);

    assertThat(account.getStatus())
        .isEqualTo(AccountStatus.INACTIVE);

    assertThat(account.getBalance())
        .isEqualTo(Money.of("2500.00"));
  }
}