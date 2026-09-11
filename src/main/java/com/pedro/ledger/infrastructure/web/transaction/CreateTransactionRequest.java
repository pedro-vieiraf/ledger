package com.pedro.ledger.infrastructure.web.transaction;

import com.pedro.ledger.domain.transaction.TransactionType;
import java.math.BigDecimal;
import java.util.UUID;
import org.antlr.v4.runtime.misc.NotNull;
import jakarta.validation.constraints.DecimalMin;

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

    UUID categoryId

) {


}
