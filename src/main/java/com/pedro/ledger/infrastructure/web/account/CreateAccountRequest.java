package com.pedro.ledger.infrastructure.web.account;

import com.pedro.ledger.domain.account.AccountType;
import java.math.BigDecimal;

/**
 * DTO for Create Account Request.
 */
public record CreateAccountRequest(
    String name,
    AccountType type,
    BigDecimal openingBalance
) {
}