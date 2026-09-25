package com.pedro.ledger.domain.account;

public class AccountInactiveException extends IllegalStateException {

  public AccountInactiveException(String message) {
    super(message);
  }
}
