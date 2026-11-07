package com.pedro.ledger.domain.account;

/**
 * Thrown when an operation requires an inactive account.
 */
public class AccountNotInactiveException extends IllegalStateException {

  public AccountNotInactiveException(String message) {
    super(message);
  }
}
