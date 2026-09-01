package com.pedro.ledger.domain.money;

import java.util.Currency;

public class CurrencyMismatchException extends RuntimeException {

  public CurrencyMismatchException(Currency expected, Currency actual) {
    super("Currency mismatch: expected " + expected.getCurrencyCode()
        + " but got " + actual.getCurrencyCode());
  }
}