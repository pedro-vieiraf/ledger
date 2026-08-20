package com.pedro.ledger.domain.money;

import java.math.BigDecimal;

public record Money(BigDecimal amount) {

  private static final int SCALE = 2;

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

  public static Money of(String amount) {
    return new Money(new BigDecimal(amount));
  }

  public Money add(Money other) {
    return new Money(amount.add(other.amount));
  }

  public Money subtract(Money other) {
    return new Money(amount.subtract(other.amount));
  }

  public Money multiply(int multiplier) {
    return new Money(amount.multiply(BigDecimal.valueOf(multiplier)));
  }

  public boolean isGreaterThan(Money other) {
    return amount.compareTo(other.amount) > 0;
  }

  public boolean isLessThan(Money other) {
    return amount.compareTo(other.amount) < 0;
  }

  public boolean isZero() {
    return amount.compareTo(BigDecimal.ZERO) == 0;
  }
}