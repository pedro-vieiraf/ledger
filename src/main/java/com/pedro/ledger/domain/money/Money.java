package com.pedro.ledger.domain.money;

import java.math.BigDecimal;

/**
 * Represents a monetary value with a fixed scale of two decimal places.
 *
 * @param amount monetary amount
 */
public record Money(BigDecimal amount) {

  private static final int SCALE = 2;

  /**
   * Creates a monetary value.
   *
   * @param amount monetary amount
   * @throws IllegalArgumentException if the amount is null or has more than
   *     two decimal places
   */
  public Money {
    if (amount == null) {
      throw new IllegalArgumentException("Amount cannot be null");
    }

    if (amount.scale() > SCALE) {
      throw new IllegalArgumentException(
          "Amount cannot have more than 2 decimal places"
      );
    }

    amount = amount.setScale(SCALE);
  }

  /**
   * Creates a monetary value from a string representation.
   *
   * @param amount string representation of the monetary amount
   * @return a monetary value
   */
  public static Money of(String amount) {
    return new Money(new BigDecimal(amount));
  }

  /**
   * Adds another monetary value to this value.
   *
   * @param other monetary value to add
   * @return the sum of both monetary values
   */
  public Money add(Money other) {
    return new Money(amount.add(other.amount));
  }

  /**
   * Subtracts another monetary value from this value.
   *
   * @param other monetary value to subtract
   * @return the difference between the monetary values
   */
  public Money subtract(Money other) {
    return new Money(amount.subtract(other.amount));
  }

  /**
   * Multiplies this monetary value by an integer.
   *
   * @param multiplier integer multiplier
   * @return the resulting monetary value
   */
  public Money multiply(int multiplier) {
    return new Money(
        amount.multiply(BigDecimal.valueOf(multiplier))
    );
  }

  /**
   * Creates a monetary value representing zero.
   *
   * @return a zero monetary value
   */
  public static Money zero() {
    return new Money(BigDecimal.ZERO);
  }

  /**
   * Checks whether this monetary value is greater than another value.
   *
   * @param other monetary value to compare with
   * @return true if this value is greater than the other value
   */
  public boolean isGreaterThan(Money other) {
    return amount.compareTo(other.amount) > 0;
  }

  /**
   * Checks whether this monetary value is less than another value.
   *
   * @param other monetary value to compare with
   * @return true if this value is less than the other value
   */
  public boolean isLessThan(Money other) {
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
}