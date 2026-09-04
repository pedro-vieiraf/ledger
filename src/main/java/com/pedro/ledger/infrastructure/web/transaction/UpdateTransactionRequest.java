package com.pedro.ledger.infrastructure.web.transaction;

import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * Represents a request to update a transaction.
 *
 * @param amount new transaction amount
 * @param description new transaction description
 * @param categoryId new category identifier
 */
public record UpdateTransactionRequest(

    @DecimalMin(value = "0.01")
    BigDecimal amount,
    String currency,
    String description,
    UUID categoryId
) {
}
