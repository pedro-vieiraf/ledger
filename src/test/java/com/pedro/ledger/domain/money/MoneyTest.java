package com.pedro.ledger.domain.money;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MoneyTest {

  @Test
  void shouldCreateMoney() {
    Money money = Money.of("100.00");

    assertThat(money.amount())
        .isEqualByComparingTo("100.00");
  }

  @Test
  void shouldNormalizeAmountToTwoDecimalPlaces() {
    Money money = Money.of("100");

    assertThat(money.amount())
        .isEqualByComparingTo("100.00");
  }

  @Test
  void shouldRejectNullAmount() {
    assertThatThrownBy(() -> new Money(null))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void shouldRejectMoreThanTwoDecimalPlaces() {
    assertThatThrownBy(() -> Money.of("100.001"))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void shouldAddTwoMoneyValues() {
    Money first = Money.of("100.00");
    Money second = Money.of("50.00");

    Money result = first.add(second);

    assertThat(result.amount())
        .isEqualByComparingTo("150.00");
  }

  @Test
  void shouldSubtractTwoMoneyValues() {
    Money first = Money.of("100.00");
    Money second = Money.of("30.00");

    Money result = first.subtract(second);

    assertThat(result.amount())
        .isEqualByComparingTo("70.00");
  }

  @Test
  void shouldMultiplyMoneyByAnInteger() {
    Money money = Money.of("10.00");

    Money result = money.multiply(3);

    assertThat(result.amount())
        .isEqualByComparingTo("30.00");
  }

  @Test
  void shouldAllowNegativeValues() {
    Money money = Money.of("-100.00");

    assertThat(money.amount())
        .isEqualByComparingTo("-100.00");
  }

  @Test
  void shouldAllowZero() {
    Money money = Money.of("0.00");

    assertThat(money.isZero())
        .isTrue();
  }

  @Test
  void shouldCompareMoneyValues() {
    Money hundred = Money.of("100.00");
    Money fifty = Money.of("50.00");

    assertThat(hundred.isGreaterThan(fifty))
        .isTrue();

    assertThat(fifty.isLessThan(hundred))
        .isTrue();
  }
}