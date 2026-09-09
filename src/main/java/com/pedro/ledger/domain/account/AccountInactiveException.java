package com.pedro.ledger.domain.account;

public class AccountInactiveException extends RuntimeException {

  public AccountInactiveException(String message) {
    super(message);
  }
}
