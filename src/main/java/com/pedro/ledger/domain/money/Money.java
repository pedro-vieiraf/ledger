package com.pedro.ledger.domain.money;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;

/**
 * Represents a monetary value with a fixed scale of two decimal places
 * and an associated currency.
 *
 * @param amount monetary amount
 * @param currency currency of the monetary amount
 */
public record Money(BigDecimal amount, Currency currency) {

  private static final int SCALE = 2;
  private static final Currency DEFAULT_CURRENCY =
      Currency.getInstance("BRL");

  /**
   * Creates a monetary value.
   *
   * @param amount monetary amount
   * @param currency currency of the monetary amount
   * @throws IllegalArgumentException if the amount or currency is null,
   *     or if the amount has more than two decimal places
   */
  public Money {
    if (amount == null) {
      throw new IllegalArgumentException("Amount cannot be null");
    }

    if (currency == null) {
      throw new IllegalArgumentException("Currency cannot be null");
    }

    if (amount.scale() > SCALE) {
      throw new IllegalArgumentException(
          "Amount cannot have more than 2 decimal places"
      );
    }

    amount = amount.setScale(SCALE);
  }

  /**
   * Creates a monetary value using the default currency.
   *
   * @param amount monetary amount
   * @return a monetary value using the default currency
   */
  public static Money of(BigDecimal amount) {
    return new Money(amount, DEFAULT_CURRENCY);
  }

  /**
   * Creates a monetary value from a string using the default currency.
   *
   * @param amount string representation of the monetary amount
   * @return a monetary value using the default currency
   */
  public static Money of(String amount) {
    return new Money(new BigDecimal(amount), DEFAULT_CURRENCY);
  }

  /**
   * Adds another monetary value to this value.
   *
   * @param other monetary value to add
   * @return the sum of both monetary values
   * @throws CurrencyMismatchException if the currencies do not match
   */
  public Money add(Money other) {
    requireSameCurrency(other);

    return new Money(
        amount.add(other.amount),
        currency
    );
  }

  /**
   * Subtracts another monetary value from this value.
   *
   * @param other monetary value to subtract
   * @return the difference between the monetary values
   * @throws CurrencyMismatchException if the currencies do not match
   */
  public Money subtract(Money other) {
    requireSameCurrency(other);

    return new Money(
        amount.subtract(other.amount),
        currency
    );
  }

  /**
   * Multiplies this monetary value by an integer.
   *
   * @param multiplier integer multiplier
   * @return the resulting monetary value
   */
  public Money multiply(int multiplier) {
    return new Money(
        amount.multiply(BigDecimal.valueOf(multiplier)),
        currency
    );
  }

  /**
   * Divides this monetary value by an integer.
   *
   * @param divisor integer divisor
   * @return the resulting monetary value
   */
  public Money divide(int divisor) {
    return new Money(
        amount.divide(
            BigDecimal.valueOf(divisor),
            SCALE,
            RoundingMode.HALF_EVEN
        ),
        currency
    );
  }

  /**
   * Creates a monetary value representing zero using the default currency.
   *
   * @return a zero monetary value
   */
  public static Money zero() {
    return new Money(BigDecimal.ZERO, DEFAULT_CURRENCY);
  }

  /**
   * Ensures that another monetary value uses the same currency.
   *
   * @param other monetary value to compare with
   * @throws CurrencyMismatchException if the currencies do not match
   */
  private void requireSameCurrency(Money other) {
    if (!this.currency.equals(other.currency)) {
      throw new CurrencyMismatchException(this.currency, other.currency);
    }
  }

  /**
   * Checks whether this monetary value is greater than another value.
   *
   * @param other monetary value to compare with
   * @return true if this value is greater than the other value
   * @throws CurrencyMismatchException if the currencies do not match
   */
  public boolean isGreaterThan(Money other) {
    requireSameCurrency(other);

    return amount.compareTo(other.amount) > 0;
  }

  /**
   * Checks whether this monetary value is less than another value.
   *
   * @param other monetary value to compare with
   * @return true if this value is less than the other value
   * @throws CurrencyMismatchException if the currencies do not match
   */
  public boolean isLessThan(Money other) {
    requireSameCurrency(other);

    return amount.compareTo(other.amount) < 0;
  }

  /**
   * Checks whether this monetary value is zero.
   *
   * @return true if this value is zero
   */
  public boolean isZero() {
    return amount.compareTo(BigDecimal.ZERO) == 0;
  }

  /**
   * Checks whether this monetary value is negative.
   *
   * @return true if this value is negative
   */
  public boolean isNegative() {
    return amount.compareTo(BigDecimal.ZERO) < 0;
  }

  /**
   * Creates a monetary value with the opposite sign.
   *
   * @return a monetary value with the opposite sign
   */
  public Money negate() {
    return new Money(amount.negate(), currency);
  }
}