package com.pedro.ledger.domain.money;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;

public record Money(BigDecimal amount, Currency currency) {

  private static final int SCALE = 2;
  private static final Currency DEFAULT_CURRENCY = Currency.getInstance("BRL");

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

  public static Money of(BigDecimal amount) {
    return new Money(amount, DEFAULT_CURRENCY);
  }

  public static Money of(String amount) {
    return new Money(new BigDecimal(amount), DEFAULT_CURRENCY);
  }

  public Money add(Money other) {
    requireSameCurrency(other);
    return new Money(amount.add(other.amount), currency);
  }

  public Money subtract(Money other) {
    requireSameCurrency(other);
    return new Money(amount.subtract(other.amount), currency);
  }

  public Money multiply(int multiplier) {
    return new Money(amount.multiply(BigDecimal.valueOf(multiplier)), currency);
  }

  public Money divide(int divisor) {
    return new Money(
        amount.divide(BigDecimal.valueOf(divisor),
        SCALE,
        RoundingMode.HALF_EVEN),
        currency);
  }

  public static Money zero() {
    return new Money(BigDecimal.ZERO, DEFAULT_CURRENCY);
  }

  private void requireSameCurrency(Money other) {
    if (!this.currency.equals(other.currency)) {
      throw new CurrencyMismatchException(this.currency, other.currency);
    }
  }

  public boolean isGreaterThan(Money other) {
    requireSameCurrency(other);
    return amount.compareTo(other.amount) > 0;
  }

  public boolean isLessThan(Money other) {
    requireSameCurrency(other);
    return amount.compareTo(other.amount) < 0;
  }

  public boolean isZero() {
    return amount.compareTo(BigDecimal.ZERO) == 0;
  }

  public boolean isNegative() {
    return amount.compareTo(BigDecimal.ZERO) < 0;
  }

  public Money negate() {
    return new Money(amount.negate(), currency);
  }
}