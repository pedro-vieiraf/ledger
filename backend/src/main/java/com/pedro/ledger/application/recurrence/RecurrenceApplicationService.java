package com.pedro.ledger.application.recurrence;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountInactiveException;
import com.pedro.ledger.domain.account.AccountNotFoundException;
import com.pedro.ledger.domain.account.AccountRepository;
import com.pedro.ledger.domain.category.CategoryNotFoundException;
import com.pedro.ledger.domain.category.CategoryRepository;
import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.recurrence.Recurrence;
import com.pedro.ledger.domain.recurrence.RecurrenceFrequency;
import com.pedro.ledger.domain.recurrence.RecurrenceNotFoundException;
import com.pedro.ledger.domain.recurrence.RecurrenceProcessor;
import com.pedro.ledger.domain.recurrence.RecurrenceRepository;
import com.pedro.ledger.domain.recurrence.RecurrenceStatus;
import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.domain.transaction.TransactionRepository;
import com.pedro.ledger.domain.transaction.TransactionType;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Currency;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Application service responsible for recurrence use cases.
 */
@Service
public class RecurrenceApplicationService {

  private static final Currency DEFAULT_CURRENCY =
      Currency.getInstance("BRL");

  private final RecurrenceRepository recurrenceRepository;
  private final AccountRepository accountRepository;
  private final CategoryRepository categoryRepository;
  private final TransactionRepository transactionRepository;

  public RecurrenceApplicationService(
      RecurrenceRepository recurrenceRepository,
      AccountRepository accountRepository,
      CategoryRepository categoryRepository,
      TransactionRepository transactionRepository
  ) {
    this.recurrenceRepository = recurrenceRepository;
    this.accountRepository = accountRepository;
    this.categoryRepository = categoryRepository;
    this.transactionRepository = transactionRepository;
  }

  @Transactional
  public Recurrence create(
      BigDecimal amount,
      String currency,
      TransactionType type,
      String description,
      UUID accountId,
      UUID categoryId,
      RecurrenceFrequency frequency,
      LocalDate startDate
  ) {
    Account account = accountRepository.findById(accountId)
        .orElseThrow(() ->
            new AccountNotFoundException("Account not found")
        );

    if (!account.isActive()) {
      throw new AccountInactiveException("Account is inactive");
    }

    validateCategory(categoryId);

    Currency recurrenceCurrency = currency == null
        ? DEFAULT_CURRENCY
        : Currency.getInstance(currency);

    Recurrence recurrence = Recurrence.create(
        Money.of(amount, recurrenceCurrency),
        type,
        description,
        accountId,
        categoryId,
        frequency,
        startDate
    );

    return recurrenceRepository.save(recurrence);
  }

  public List<Recurrence> findAll() {
    return recurrenceRepository.findAll();
  }

  public Optional<Recurrence> findById(UUID id) {
    return recurrenceRepository.findById(id);
  }

  @Transactional
  public Recurrence update(
      UUID id,
      BigDecimal amount,
      String description,
      UUID categoryId
  ) {
    Recurrence recurrence = getByIdOrThrow(id);

    if (amount != null) {
      recurrence.changeAmount(
          Money.of(
              amount,
              recurrence.getAmount().currency()
          )
      );
    }

    if (description != null) {
      recurrence.changeDescription(description);
    }

    if (categoryId != null) {
      validateCategory(categoryId);
      recurrence.changeCategory(categoryId);
    }

    return recurrenceRepository.save(recurrence);
  }

  /**
   * Cancels a recurrence. Generated transactions are preserved.
   */
  @Transactional
  public Recurrence cancel(UUID id) {
    Recurrence recurrence = getByIdOrThrow(id);

    recurrence.deactivate();

    return recurrenceRepository.save(recurrence);
  }

  /**
   * Reactivates a cancelled recurrence.
   */
  @Transactional
  public Recurrence activate(UUID id) {
    Recurrence recurrence = getByIdOrThrow(id);

    recurrence.activate();

    return recurrenceRepository.save(recurrence);
  }

  /**
   * Permanently ends a recurrence. Generated transactions are preserved, but
   * their recurrence link is removed so no dangling reference remains.
   */
  @Transactional
  public void delete(UUID id) {
    getByIdOrThrow(id);

    transactionRepository.clearRecurrenceLink(id);
    recurrenceRepository.delete(id);
  }

  /**
   * Returns identifiers of active recurrences due on or before the date.
   */
  public List<UUID> findDueRecurrenceIds(LocalDate date) {
    return recurrenceRepository.findDueIds(date);
  }

  /**
   * Generates every pending occurrence for a recurrence up to the provided
   * date, applying the normal transaction balance rules.
   *
   * <p>The recurrence row is locked while processing. The generated
   * transaction and the recurrence advance are committed in the same
   * transaction, and the occurrence is uniquely identified in the database,
   * so retries cannot generate duplicates.
   */
  @Transactional
  public void generatePendingOccurrences(
      UUID recurrenceId,
      LocalDate today,
      ZoneId zoneId
  ) {
    Recurrence recurrence = recurrenceRepository
        .findByIdForUpdate(recurrenceId)
        .orElse(null);

    if (recurrence == null
        || recurrence.getStatus() != RecurrenceStatus.ACTIVE) {
      return;
    }

    Account account = accountRepository
        .findById(recurrence.getAccountId())
        .orElseThrow(() ->
            new AccountNotFoundException("Account not found")
        );

    boolean changed = false;

    while (!recurrence.getNextOccurrence().isAfter(today)) {
      LocalDate occurrenceDate = recurrence.getNextOccurrence();
      Optional<Transaction> existing = transactionRepository
          .findByRecurrenceIdAndOccurrenceDate(recurrenceId, occurrenceDate);

      if (existing.isPresent()) {
        recurrence.advanceToNextOccurrence();
        changed = true;
        continue;
      }

      Instant timestamp = occurrenceDate
          .atStartOfDay(zoneId)
          .toInstant();

      Transaction transaction = RecurrenceProcessor.process(
          recurrence,
          account,
          timestamp,
          today,
          transactionIdFor(recurrenceId, occurrenceDate),
          recurrenceId
      );

      accountRepository.save(account);
      transactionRepository.save(transaction);

      changed = true;
    }

    if (changed) {
      recurrenceRepository.save(recurrence);
    }
  }

  private Recurrence getByIdOrThrow(UUID id) {
    return recurrenceRepository.findById(id)
        .orElseThrow(RecurrenceNotFoundException::new);
  }

  private void validateCategory(UUID categoryId) {
    if (categoryId == null) {
      return;
    }

    categoryRepository.findById(categoryId)
        .orElseThrow(CategoryNotFoundException::new);
  }

  private UUID transactionIdFor(
      UUID recurrenceId,
      LocalDate occurrenceDate
  ) {
    String seed = recurrenceId + ":" + occurrenceDate;

    return UUID.nameUUIDFromBytes(
        seed.getBytes(StandardCharsets.UTF_8)
    );
  }
}
