package com.pedro.ledger.infrastructure.web.account;

import com.pedro.ledger.domain.account.AccountType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * DTO for Create Account Request.
 */
public record CreateAccountRequest(
    @NotBlank
    String name,

    @NotNull
    AccountType type,

    @NotNull
    @DecimalMin("0.00")
    BigDecimal openingBalance,

    String currency
) {
}