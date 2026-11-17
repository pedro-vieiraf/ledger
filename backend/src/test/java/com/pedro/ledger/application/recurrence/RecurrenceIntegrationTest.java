package com.pedro.ledger.application.recurrence;

import static org.assertj.core.api.Assertions.assertThat;

import com.pedro.ledger.application.account.AccountApplicationService;
import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountRepository;
import com.pedro.ledger.domain.account.AccountType;
import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.recurrence.Recurrence;
import com.pedro.ledger.domain.recurrence.RecurrenceFrequency;
import com.pedro.ledger.domain.recurrence.RecurrenceStatus;
import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.domain.transaction.TransactionRepository;
import com.pedro.ledger.domain.transaction.TransactionType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "ledger.recurrence.scheduler-enabled=false"
})
@Testcontainers
@SpringBootTest
@Transactional
class RecurrenceIntegrationTest {

  private static final ZoneId ZONE_ID =
      ZoneId.of("America/Sao_Paulo");

  @Container
  @ServiceConnection
  static PostgreSQLContainer postgres =
      new PostgreSQLContainer("postgres:17");

  @Autowired
  private AccountApplicationService accountApplicationService;

  @Autowired
  private AccountRepository accountRepository;

  @Autowired
  private RecurrenceApplicationService recurrenceApplicationService;

  @Autowired
  private TransactionRepository transactionRepository;

  private Account account;

  @BeforeEach
  void setUp() {
    account = accountApplicationService.create(
        "Checking Account",
        AccountType.CHECKING,
        new BigDecimal("1000.00"),
        "BRL"
    );
  }

  @Test
  void shouldGenerateOccurrencesWithoutDuplicatesAndPreserveHistory() {
    Recurrence recurrence = recurrenceApplicationService.create(
        new BigDecimal("100.00"),
        "BRL",
        TransactionType.EXPENSE,
        "Netflix",
        account.getId(),
        null,
        RecurrenceFrequency.MONTHLY,
        LocalDate.of(2026, 5, 10)
    );

    recurrenceApplicationService.generatePendingOccurrences(
        recurrence.getId(),
        LocalDate.of(2026, 5, 10),
        ZONE_ID
    );

    assertThat(balance()).isEqualTo("900.00");
    assertThat(transactionsOf(recurrence)).hasSize(1);

    Transaction first = transactionsOf(recurrence).get(0);

    assertThat(first.getOccurrenceDate())
        .isEqualTo(LocalDate.of(2026, 5, 10));
    assertThat(first.getTimestamp()).isEqualTo(
        LocalDate.of(2026, 5, 10)
            .atStartOfDay(ZONE_ID)
            .toInstant()
    );

    // Re-executing the scheduler for the same date must not duplicate.
    recurrenceApplicationService.generatePendingOccurrences(
        recurrence.getId(),
        LocalDate.of(2026, 5, 10),
        ZONE_ID
    );

    assertThat(balance()).isEqualTo("900.00");
    assertThat(transactionsOf(recurrence)).hasSize(1);

    recurrenceApplicationService.generatePendingOccurrences(
        recurrence.getId(),
        LocalDate.of(2026, 6, 10),
        ZONE_ID
    );

    assertThat(balance()).isEqualTo("800.00");
    assertThat(transactionsOf(recurrence)).hasSize(2);

    Recurrence afterTwoMonths = recurrenceApplicationService
        .findById(recurrence.getId())
        .orElseThrow();

    assertThat(afterTwoMonths.getNextOccurrence())
        .isEqualTo(LocalDate.of(2026, 7, 10));

    recurrenceApplicationService.cancel(recurrence.getId());

    recurrenceApplicationService.generatePendingOccurrences(
        recurrence.getId(),
        LocalDate.of(2026, 7, 10),
        ZONE_ID
    );

    assertThat(balance()).isEqualTo("800.00");
    assertThat(transactionsOf(recurrence)).hasSize(2);

    recurrenceApplicationService.update(
        recurrence.getId(),
        new BigDecimal("150.00"),
        "Netflix Premium",
        null
    );
    recurrenceApplicationService.activate(recurrence.getId());

    recurrenceApplicationService.generatePendingOccurrences(
        recurrence.getId(),
        LocalDate.of(2026, 7, 10),
        ZONE_ID
    );

    assertThat(balance()).isEqualTo("650.00");

    List<Transaction> afterResume = transactionsOf(recurrence);

    assertThat(afterResume).hasSize(3);
    assertThat(afterResume.stream().anyMatch(transaction ->
        transaction.getAmount().equals(Money.of("150.00"))
    )).isTrue();

    recurrenceApplicationService.delete(recurrence.getId());

    List<Transaction> preserved = transactionRepository.findAll();

    assertThat(preserved).hasSize(3);
    assertThat(preserved)
        .allSatisfy(transaction -> {
          assertThat(transaction.getRecurrenceId()).isNull();
          assertThat(transaction.getOccurrenceDate()).isNull();
        });
  }

  @Test
  void shouldApplyIncomeOccurrenceAndAdvanceFrequency() {
    Recurrence recurrence = recurrenceApplicationService.create(
        new BigDecimal("500.00"),
        "BRL",
        TransactionType.INCOME,
        "Salary",
        account.getId(),
        null,
        RecurrenceFrequency.WEEKLY,
        LocalDate.of(2026, 5, 10)
    );

    recurrenceApplicationService.generatePendingOccurrences(
        recurrence.getId(),
        LocalDate.of(2026, 5, 24),
        ZONE_ID
    );

    assertThat(balance()).isEqualTo("2500.00");
    assertThat(transactionsOf(recurrence)).hasSize(3);

    Recurrence updated = recurrenceApplicationService
        .findById(recurrence.getId())
        .orElseThrow();

    assertThat(updated.getNextOccurrence())
        .isEqualTo(LocalDate.of(2026, 5, 31));
    assertThat(updated.getStatus())
        .isEqualTo(RecurrenceStatus.ACTIVE);
  }

  private java.math.BigDecimal balance() {
    return accountRepository.findById(account.getId())
        .orElseThrow()
        .getBalance()
        .amount();
  }

  private List<Transaction> transactionsOf(Recurrence recurrence) {
    return transactionRepository.findAll()
        .stream()
        .filter(transaction -> recurrence.getId()
            .equals(transaction.getRecurrenceId()))
        .toList();
  }
}
