package com.pedro.ledger.infrastructure.persistence.recurrence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountRepository;
import com.pedro.ledger.domain.account.AccountType;
import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.recurrence.Recurrence;
import com.pedro.ledger.domain.recurrence.RecurrenceFrequency;
import com.pedro.ledger.domain.recurrence.RecurrenceRepository;
import com.pedro.ledger.domain.recurrence.RecurrenceStatus;
import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.domain.transaction.TransactionRepository;
import com.pedro.ledger.domain.transaction.TransactionSource;
import com.pedro.ledger.domain.transaction.TransactionType;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
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
class RecurrencePersistenceRepositoryTest {

  @Container
  @ServiceConnection
  static PostgreSQLContainer postgres =
      new PostgreSQLContainer("postgres:17");

  @Autowired
  private RecurrenceRepository recurrenceRepository;

  @Autowired
  private AccountRepository accountRepository;

  @Autowired
  private TransactionRepository transactionRepository;

  private Account account;

  @BeforeEach
  void setUp() {
    account = accountRepository.save(
        Account.open(
            "Checking Account",
            AccountType.CHECKING,
            Money.of("1000.00")
        )
    );
  }

  private Recurrence recurrence(
      TransactionType type,
      LocalDate startDate
  ) {
    return Recurrence.create(
        Money.of("100.00"),
        type,
        "Recurring",
        account.getId(),
        null,
        RecurrenceFrequency.MONTHLY,
        startDate
    );
  }

  @Test
  void shouldSaveAndFindRecurrence() {
    Recurrence recurrence = recurrence(
        TransactionType.EXPENSE,
        LocalDate.of(2026, 8, 21)
    );

    Recurrence saved = recurrenceRepository.save(recurrence);

    Optional<Recurrence> found =
        recurrenceRepository.findById(saved.getId());

    assertThat(found).isPresent();
    assertThat(found.get().getAmount())
        .isEqualTo(Money.of("100.00"));
    assertThat(found.get().getType())
        .isEqualTo(TransactionType.EXPENSE);
    assertThat(found.get().getAccountId())
        .isEqualTo(account.getId());
    assertThat(found.get().getFrequency())
        .isEqualTo(RecurrenceFrequency.MONTHLY);
    assertThat(found.get().getStartDate())
        .isEqualTo(LocalDate.of(2026, 8, 21));
    assertThat(found.get().getNextOccurrence())
        .isEqualTo(LocalDate.of(2026, 8, 21));
    assertThat(found.get().getStatus())
        .isEqualTo(RecurrenceStatus.ACTIVE);
  }

  @Test
  void shouldPersistAdvancedAndInactiveState() {
    Recurrence recurrence = recurrence(
        TransactionType.EXPENSE,
        LocalDate.of(2026, 8, 21)
    );

    recurrence.advanceToNextOccurrence();
    recurrence.deactivate();

    Recurrence saved = recurrenceRepository.save(recurrence);
    Recurrence found = recurrenceRepository.findById(saved.getId())
        .orElseThrow();

    assertThat(found.getNextOccurrence())
        .isEqualTo(LocalDate.of(2026, 9, 21));
    assertThat(found.getStatus())
        .isEqualTo(RecurrenceStatus.INACTIVE);
  }

  @Test
  void shouldFindOnlyActiveRecurrencesDueOnOrBeforeDate() {
    Recurrence due = recurrence(
        TransactionType.EXPENSE,
        LocalDate.of(2026, 5, 10)
    );
    Recurrence future = recurrence(
        TransactionType.EXPENSE,
        LocalDate.of(2026, 6, 10)
    );
    Recurrence inactive = recurrence(
        TransactionType.EXPENSE,
        LocalDate.of(2026, 5, 1)
    );
    inactive.deactivate();

    recurrenceRepository.save(due);
    recurrenceRepository.save(future);
    recurrenceRepository.save(inactive);

    List<UUID> dueIds = recurrenceRepository.findDueIds(
        LocalDate.of(2026, 5, 31)
    );

    assertThat(dueIds).containsExactly(due.getId());
  }

  @Test
  void shouldRejectDuplicateOccurrenceTransaction() {
    Recurrence recurrence = recurrence(
        TransactionType.EXPENSE,
        LocalDate.of(2026, 5, 10)
    );
    Recurrence savedRecurrence = recurrenceRepository.save(recurrence);

    Transaction first = Transaction.createRecurring(
        UUID.randomUUID(),
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "Netflix",
        Instant.now(),
        TransactionSource.MANUAL,
        account.getId(),
        null,
        null,
        savedRecurrence.getId(),
        LocalDate.of(2026, 5, 10)
    );

    Transaction duplicate = Transaction.createRecurring(
        UUID.randomUUID(),
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "Netflix",
        Instant.now(),
        TransactionSource.MANUAL,
        account.getId(),
        null,
        null,
        savedRecurrence.getId(),
        LocalDate.of(2026, 5, 10)
    );

    transactionRepository.save(first);

    assertThatThrownBy(() ->
        transactionRepository.save(duplicate)
    ).isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void shouldClearRecurrenceLinkWithoutDeletingTransaction() {
    Recurrence recurrence = recurrence(
        TransactionType.EXPENSE,
        LocalDate.of(2026, 5, 10)
    );
    Recurrence savedRecurrence = recurrenceRepository.save(recurrence);

    Transaction transaction = Transaction.createRecurring(
        UUID.randomUUID(),
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "Netflix",
        Instant.now(),
        TransactionSource.MANUAL,
        account.getId(),
        null,
        null,
        savedRecurrence.getId(),
        LocalDate.of(2026, 5, 10)
    );

    Transaction saved = transactionRepository.save(transaction);

    transactionRepository.clearRecurrenceLink(savedRecurrence.getId());

    assertThat(transactionRepository
        .findByRecurrenceIdAndOccurrenceDate(
            savedRecurrence.getId(),
            LocalDate.of(2026, 5, 10)
        ))
        .isEmpty();

    Transaction preserved = transactionRepository.findById(saved.getId())
        .orElseThrow();

    assertThat(preserved.getRecurrenceId()).isNull();
    assertThat(preserved.getOccurrenceDate()).isNull();
  }
}
