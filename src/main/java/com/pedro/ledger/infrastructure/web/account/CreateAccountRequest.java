package com.pedro.ledger.infrastructure.web.account;

import com.pedro.ledger.domain.account.AccountType;
import java.math.BigDecimal;

public record CreateAccountRequest(
    String name,
    AccountType type,
    BigDecimal openingBalance
) {
}