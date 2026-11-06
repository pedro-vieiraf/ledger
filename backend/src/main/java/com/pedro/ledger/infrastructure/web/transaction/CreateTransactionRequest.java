package com.pedro.ledger.infrastructure.web.transaction;

import com.pedro.ledger.domain.transaction.TransactionType;
import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
import java.util.UUID;
import jakarta.validation.constraints.NotNull;

public record CreateTransactionRequest(

    @NotNull
    @DecimalMin(value = "0.01")
    BigDecimal amount,

    @NotNull
    String currency,

    @NotNull
    TransactionType type,

    String description,

    @NotNull
    UUID accountId,

    UUID destinationAccountId,

    UUID categoryId,

    /**
     * Optional caller-provided identifier used to make creation idempotent.
     * Retrying with the same identifier returns the existing transaction.
     */
    UUID id

) {


}
