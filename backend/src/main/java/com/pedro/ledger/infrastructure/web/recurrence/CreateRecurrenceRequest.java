package com.pedro.ledger.infrastructure.web.recurrence;

import com.pedro.ledger.domain.recurrence.RecurrenceFrequency;
import com.pedro.ledger.domain.transaction.TransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Request used to create a recurrence rule.
 */
public record CreateRecurrenceRequest(

    @NotNull
    @DecimalMin(value = "0.01")
    BigDecimal amount,

    String currency,

    @NotNull
    TransactionType type,

    String description,

    @NotNull
    UUID accountId,

    UUID categoryId,

    @NotNull
    RecurrenceFrequency frequency,

    @NotNull
    LocalDate startDate
) {
}
