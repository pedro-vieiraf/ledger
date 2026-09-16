package com.pedro.ledger.infrastructure.web.transaction;

import com.pedro.ledger.domain.transaction.TransactionType;
import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
import java.util.UUID;
import org.antlr.v4.runtime.misc.NotNull;

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
