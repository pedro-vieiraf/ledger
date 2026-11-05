package com.pedro.ledger.domain.account;

public class AccountAlreadyInactiveException extends IllegalStateException {

  public AccountAlreadyInactiveException(String message) {
    super(message);
  }
}
