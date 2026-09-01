package com.pedro.ledger.domain.money;

import java.util.Currency;

/**
 * Exception thrown when two currencies do not match.
 */
public class CurrencyMismatchException extends RuntimeException {

  /**
   * Creates a currency mismatch exception.
   *
   * @param expected expected currency
   * @param actual actual currency
   */
  public CurrencyMismatchException(
      Currency expected,
      Currency actual
  ) {
    super(
        "Currency mismatch: expected " + expected.getCurrencyCode()
            + " but got " + actual.getCurrencyCode()
    );
  }
}