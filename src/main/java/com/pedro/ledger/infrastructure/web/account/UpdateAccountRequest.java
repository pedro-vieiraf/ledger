package com.pedro.ledger.infrastructure.web.account;

import com.pedro.ledger.domain.account.AccountType;

public record UpdateAccountRequest(
    String name,
    AccountType type
) {

}
