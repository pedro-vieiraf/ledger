package com.pedro.ledger.infrastructure.web.recurrence;

import com.pedro.ledger.domain.recurrence.Recurrence;
import com.pedro.ledger.domain.recurrence.RecurrenceFrequency;
import com.pedro.ledger.domain.recurrence.RecurrenceStatus;
import com.pedro.ledger.domain.transaction.TransactionType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Response returned by recurrence endpoints.
 */
public record RecurrenceResponse(
    UUID id,
    BigDecimal amount,
    String currency,
    TransactionType type,
    String description,
    UUID accountId,
    UUID categoryId,
    RecurrenceFrequency frequency,
    LocalDate startDate,
    LocalDate nextOccurrence,
    RecurrenceStatus status
) {

  public static RecurrenceResponse from(Recurrence recurrence) {
    return new RecurrenceResponse(
        recurrence.getId(),
        recurrence.getAmount().amount(),
        recurrence.getAmount().currency().getCurrencyCode(),
        recurrence.getType(),
        recurrence.getDescription(),
        recurrence.getAccountId(),
        recurrence.getCategoryId(),
        recurrence.getFrequency(),
        recurrence.getStartDate(),
        recurrence.getNextOccurrence(),
        recurrence.getStatus()
    );
  }
}
