package com.pedro.ledger.infrastructure.web.recurrence;

import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * Request used to update the editable recurrence fields.
 */
public record UpdateRecurrenceRequest(

    @DecimalMin(value = "0.01")
    BigDecimal amount,

    String description,

    UUID categoryId
) {
}
