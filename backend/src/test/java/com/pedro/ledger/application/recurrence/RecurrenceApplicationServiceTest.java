package com.pedro.ledger.application.recurrence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountInactiveException;
import com.pedro.ledger.domain.account.AccountNotFoundException;
import com.pedro.ledger.domain.account.AccountRepository;
import com.pedro.ledger.domain.account.AccountType;
import com.pedro.ledger.domain.category.Category;
import com.pedro.ledger.domain.category.CategoryNotFoundException;
import com.pedro.ledger.domain.category.CategoryRepository;
import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.recurrence.Recurrence;
import com.pedro.ledger.domain.recurrence.RecurrenceFrequency;
import com.pedro.ledger.domain.recurrence.RecurrenceNotFoundException;
import com.pedro.ledger.domain.recurrence.RecurrenceRepository;
import com.pedro.ledger.domain.recurrence.RecurrenceStatus;
import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.domain.transaction.TransactionRepository;
import com.pedro.ledger.domain.transaction.TransactionType;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

class RecurrenceApplicationServiceTest {

  private static final ZoneId ZONE_ID =
      ZoneId.of("America/Sao_Paulo");

  @Mock
  private RecurrenceRepository recurrenceRepository;

  @Mock
  private AccountRepository accountRepository;

  @Mock
  private CategoryRepository categoryRepository;

  @Mock
  private TransactionRepository transactionRepository;

  private RecurrenceApplicationService service;

  @BeforeEach
  void setUp() {
    MockitoAnnotations.openMocks(this);

    service = new RecurrenceApplicationService(
        recurrenceRepository,
        accountRepository,
        categoryRepository,
        transactionRepository
    );
  }

  private Account activeAccount() {
    return Account.open(
        "Checking Account",
        AccountType.CHECKING,
        Money.of("1000.00")
    );
  }

  private Recurrence recurrence(
      Account account,
      LocalDate startDate
  ) {
    return Recurrence.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "Netflix",
        account.getId(),
        null,
        RecurrenceFrequency.MONTHLY,
        startDate
    );
  }

  @Nested
  class Create {

    @Test
    void shouldCreateActiveRecurrence() {
      Account account = activeAccount();

      when(accountRepository.findById(account.getId()))
          .thenReturn(Optional.of(account));

      when(recurrenceRepository.save(any(Recurrence.class)))
          .thenAnswer(invocation -> invocation.getArgument(0));

      Recurrence result = service.create(
          new BigDecimal("100.00"),
          "BRL",
          TransactionType.EXPENSE,
          "Netflix",
          account.getId(),
          null,
          RecurrenceFrequency.MONTHLY,
          LocalDate.of(2026, 8, 21)
      );

      assertThat(result.getAmount()).isEqualTo(Money.of("100.00"));
      assertThat(result.getType()).isEqualTo(TransactionType.EXPENSE);
      assertThat(result.getStatus()).isEqualTo(RecurrenceStatus.ACTIVE);
      assertThat(result.getNextOccurrence())
          .isEqualTo(LocalDate.of(2026, 8, 21));

      verify(recurrenceRepository).save(result);
    }

    @Test
    void shouldRejectUnknownAccount() {
      UUID accountId = UUID.randomUUID();

      when(accountRepository.findById(accountId))
          .thenReturn(Optional.empty());

      assertThatThrownBy(() -> service.create(
          new BigDecimal("100.00"),
          "BRL",
          TransactionType.EXPENSE,
          "Netflix",
          accountId,
          null,
          RecurrenceFrequency.MONTHLY,
          LocalDate.of(2026, 8, 21)
      )).isInstanceOf(AccountNotFoundException.class);
    }

    @Test
    void shouldRejectInactiveAccount() {
      Account account = activeAccount();
      account.deactivate();

      when(accountRepository.findById(account.getId()))
          .thenReturn(Optional.of(account));

      assertThatThrownBy(() -> service.create(
          new BigDecimal("100.00"),
          "BRL",
          TransactionType.EXPENSE,
          "Netflix",
          account.getId(),
          null,
          RecurrenceFrequency.MONTHLY,
          LocalDate.of(2026, 8, 21)
      )).isInstanceOf(AccountInactiveException.class);
    }

    @Test
    void shouldRejectUnknownCategory() {
      Account account = activeAccount();
      UUID categoryId = UUID.randomUUID();

      when(accountRepository.findById(account.getId()))
          .thenReturn(Optional.of(account));

      when(categoryRepository.findById(categoryId))
          .thenReturn(Optional.empty());

      assertThatThrownBy(() -> service.create(
          new BigDecimal("100.00"),
          "BRL",
          TransactionType.EXPENSE,
          "Netflix",
          account.getId(),
          categoryId,
          RecurrenceFrequency.MONTHLY,
          LocalDate.of(2026, 8, 21)
      )).isInstanceOf(CategoryNotFoundException.class);
    }
  }

  @Nested
  class Update {

    @Test
    void shouldUpdateAmountDescriptionAndCategory() {
      Account account = activeAccount();
      Recurrence recurrence = recurrence(
          account,
          LocalDate.of(2026, 8, 21)
      );
      Category category = Category.create("Streaming");

      when(recurrenceRepository.findById(recurrence.getId()))
          .thenReturn(Optional.of(recurrence));

      when(categoryRepository.findById(category.getId()))
          .thenReturn(Optional.of(category));

      when(recurrenceRepository.save(any(Recurrence.class)))
          .thenAnswer(invocation -> invocation.getArgument(0));

      Recurrence result = service.update(
          recurrence.getId(),
          new BigDecimal("120.00"),
          "Netflix Premium",
          category.getId()
      );

      assertThat(result.getAmount()).isEqualTo(Money.of("120.00"));
      assertThat(result.getDescription()).isEqualTo("Netflix Premium");
      assertThat(result.getCategoryId()).isEqualTo(category.getId());
      assertThat(result.getNextOccurrence())
          .isEqualTo(LocalDate.of(2026, 8, 21));
    }

    @Test
    void shouldRejectUnknownRecurrence() {
      UUID id = UUID.randomUUID();

      when(recurrenceRepository.findById(id))
          .thenReturn(Optional.empty());

      assertThatThrownBy(() -> service.update(
          id,
          new BigDecimal("120.00"),
          null,
          null
      )).isInstanceOf(RecurrenceNotFoundException.class);
    }
  }

  @Nested
  class CancelAndActivate {

    @Test
    void shouldCancelRecurrenceAndPreserveNextOccurrence() {
      Account account = activeAccount();
      Recurrence recurrence = recurrence(
          account,
          LocalDate.of(2026, 8, 21)
      );

      when(recurrenceRepository.findById(recurrence.getId()))
          .thenReturn(Optional.of(recurrence));

      when(recurrenceRepository.save(any(Recurrence.class)))
          .thenAnswer(invocation -> invocation.getArgument(0));

      Recurrence result = service.cancel(recurrence.getId());

      assertThat(result.getStatus()).isEqualTo(RecurrenceStatus.INACTIVE);
      assertThat(result.getNextOccurrence())
          .isEqualTo(LocalDate.of(2026, 8, 21));
    }

    @Test
    void shouldRejectCancellingAlreadyInactiveRecurrence() {
      Account account = activeAccount();
      Recurrence recurrence = recurrence(
          account,
          LocalDate.of(2026, 8, 21)
      );
      recurrence.deactivate();

      when(recurrenceRepository.findById(recurrence.getId()))
          .thenReturn(Optional.of(recurrence));

      assertThatThrownBy(() ->
          service.cancel(recurrence.getId())
      ).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void shouldActivateInactiveRecurrence() {
      Account account = activeAccount();
      Recurrence recurrence = recurrence(
          account,
          LocalDate.of(2026, 8, 21)
      );
      recurrence.deactivate();

      when(recurrenceRepository.findById(recurrence.getId()))
          .thenReturn(Optional.of(recurrence));

      when(recurrenceRepository.save(any(Recurrence.class)))
          .thenAnswer(invocation -> invocation.getArgument(0));

      Recurrence result = service.activate(recurrence.getId());

      assertThat(result.getStatus()).isEqualTo(RecurrenceStatus.ACTIVE);
    }
  }

  @Nested
  class Delete {

    @Test
    void shouldClearTransactionLinksBeforeDeletingRecurrence() {
      Account account = activeAccount();
      Recurrence recurrence = recurrence(
          account,
          LocalDate.of(2026, 8, 21)
      );

      when(recurrenceRepository.findById(recurrence.getId()))
          .thenReturn(Optional.of(recurrence));

      service.delete(recurrence.getId());

      verify(transactionRepository)
          .clearRecurrenceLink(recurrence.getId());

      verify(recurrenceRepository)
          .delete(recurrence.getId());
    }
  }

  @Nested
  class GenerateOccurrences {

    @Test
    void shouldGenerateDueOccurrenceAndUpdateBalance() {
      Account account = activeAccount();
      Recurrence recurrence = recurrence(
          account,
          LocalDate.of(2026, 5, 10)
      );

      when(recurrenceRepository.findByIdForUpdate(recurrence.getId()))
          .thenReturn(Optional.of(recurrence));

      when(accountRepository.findById(account.getId()))
          .thenReturn(Optional.of(account));

      when(transactionRepository
          .findByRecurrenceIdAndOccurrenceDate(any(), any()))
          .thenReturn(Optional.empty());

      when(transactionRepository.save(any(Transaction.class)))
          .thenAnswer(invocation -> invocation.getArgument(0));

      when(recurrenceRepository.save(any(Recurrence.class)))
          .thenAnswer(invocation -> invocation.getArgument(0));

      service.generatePendingOccurrences(
          recurrence.getId(),
          LocalDate.of(2026, 5, 10),
          ZONE_ID
      );

      ArgumentCaptor<Transaction> transactionCaptor =
          ArgumentCaptor.forClass(Transaction.class);

      verify(transactionRepository)
          .save(transactionCaptor.capture());

      Transaction transaction = transactionCaptor.getValue();

      assertThat(transaction.getAmount()).isEqualTo(Money.of("100.00"));
      assertThat(transaction.getType()).isEqualTo(TransactionType.EXPENSE);
      assertThat(transaction.getRecurrenceId())
          .isEqualTo(recurrence.getId());
      assertThat(transaction.getOccurrenceDate())
          .isEqualTo(LocalDate.of(2026, 5, 10));
      assertThat(transaction.getTimestamp())
          .isEqualTo(
              LocalDate.of(2026, 5, 10)
                  .atStartOfDay(ZONE_ID)
                  .toInstant()
          );

      assertThat(account.getBalance())
          .isEqualTo(Money.of("900.00"));

      assertThat(recurrence.getNextOccurrence())
          .isEqualTo(LocalDate.of(2026, 6, 10));

      verify(recurrenceRepository).save(recurrence);
    }

    @Test
    void shouldCatchUpAllMissedOccurrences() {
      Account account = activeAccount();
      Recurrence recurrence = recurrence(
          account,
          LocalDate.of(2026, 5, 10)
      );

      when(recurrenceRepository.findByIdForUpdate(recurrence.getId()))
          .thenReturn(Optional.of(recurrence));

      when(accountRepository.findById(account.getId()))
          .thenReturn(Optional.of(account));

      when(transactionRepository
          .findByRecurrenceIdAndOccurrenceDate(any(), any()))
          .thenReturn(Optional.empty());

      when(transactionRepository.save(any(Transaction.class)))
          .thenAnswer(invocation -> invocation.getArgument(0));

      when(recurrenceRepository.save(any(Recurrence.class)))
          .thenAnswer(invocation -> invocation.getArgument(0));

      service.generatePendingOccurrences(
          recurrence.getId(),
          LocalDate.of(2026, 7, 15),
          ZONE_ID
      );

      verify(transactionRepository, times(3))
          .save(any(Transaction.class));

      assertThat(account.getBalance())
          .isEqualTo(Money.of("700.00"));

      assertThat(recurrence.getNextOccurrence())
          .isEqualTo(LocalDate.of(2026, 8, 10));
    }

    @Test
    void shouldNotDuplicateExistingOccurrence() {
      Account account = activeAccount();
      Recurrence recurrence = recurrence(
          account,
          LocalDate.of(2026, 5, 10)
      );

      Transaction existing = Transaction.createRecurring(
          UUID.randomUUID(),
          Money.of("100.00"),
          TransactionType.EXPENSE,
          "Netflix",
          Instant.now(),
          com.pedro.ledger.domain.transaction.TransactionSource.MANUAL,
          account.getId(),
          null,
          null,
          recurrence.getId(),
          LocalDate.of(2026, 5, 10)
      );

      when(recurrenceRepository.findByIdForUpdate(recurrence.getId()))
          .thenReturn(Optional.of(recurrence));

      when(accountRepository.findById(account.getId()))
          .thenReturn(Optional.of(account));

      when(transactionRepository
          .findByRecurrenceIdAndOccurrenceDate(
              recurrence.getId(),
              LocalDate.of(2026, 5, 10)
          ))
          .thenReturn(Optional.of(existing));

      when(recurrenceRepository.save(any(Recurrence.class)))
          .thenAnswer(invocation -> invocation.getArgument(0));

      service.generatePendingOccurrences(
          recurrence.getId(),
          LocalDate.of(2026, 5, 10),
          ZONE_ID
      );

      verify(transactionRepository, never())
          .save(any(Transaction.class));

      assertThat(account.getBalance())
          .isEqualTo(Money.of("1000.00"));

      assertThat(recurrence.getNextOccurrence())
          .isEqualTo(LocalDate.of(2026, 6, 10));
    }

    @Test
    void shouldIgnoreInactiveRecurrence() {
      Account account = activeAccount();
      Recurrence recurrence = recurrence(
          account,
          LocalDate.of(2026, 5, 10)
      );
      recurrence.deactivate();

      when(recurrenceRepository.findByIdForUpdate(recurrence.getId()))
          .thenReturn(Optional.of(recurrence));

      service.generatePendingOccurrences(
          recurrence.getId(),
          LocalDate.of(2026, 5, 10),
          ZONE_ID
      );

      verify(accountRepository, never())
          .findById(any());

      verify(transactionRepository, never())
          .save(any(Transaction.class));

      verify(recurrenceRepository, never())
          .save(any(Recurrence.class));
    }

    @Test
    void shouldIgnoreMissingRecurrence() {
      UUID id = UUID.randomUUID();

      when(recurrenceRepository.findByIdForUpdate(id))
          .thenReturn(Optional.empty());

      service.generatePendingOccurrences(
          id,
          LocalDate.of(2026, 5, 10),
          ZONE_ID
      );

      verify(transactionRepository, never())
          .save(any(Transaction.class));
    }

    @Test
    void shouldExposeDueRecurrenceIds() {
      LocalDate date = LocalDate.of(2026, 5, 10);
      List<UUID> ids = List.of(UUID.randomUUID());

      when(recurrenceRepository.findDueIds(date))
          .thenReturn(ids);

      assertThat(service.findDueRecurrenceIds(date))
          .isEqualTo(ids);
    }
  }
}
