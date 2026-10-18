package com.pedro.ledger.infrastructure.web.account;

import com.pedro.ledger.domain.account.AccountType;

/**
 * DTO for Update Account Request.
 */
public record UpdateAccountRequest(
    String name,
    AccountType type
) {

}
