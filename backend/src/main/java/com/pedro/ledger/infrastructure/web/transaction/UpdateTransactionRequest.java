
package com.pedro.ledger.infrastructure.web.transaction;

import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Represents a request to update a transaction.
 *
 * @param amount new transaction amount
 * @param description new transaction description
 * @param categoryId new category identifier
 * @param timestamp new transaction timestamp
 */
public record UpdateTransactionRequest(

    @DecimalMin(value = "0.01")
    BigDecimal amount,

    String description,

    UUID categoryId,

    Instant timestamp
) {
}
