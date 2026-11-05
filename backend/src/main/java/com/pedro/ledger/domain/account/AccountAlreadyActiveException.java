package com.pedro.ledger.domain.account;

public class AccountAlreadyActiveException extends IllegalStateException {

  public AccountAlreadyActiveException(String message) {
    super(message);
  }
}
