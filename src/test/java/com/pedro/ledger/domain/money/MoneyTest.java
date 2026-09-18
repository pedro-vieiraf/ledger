package com.pedro.ledger.domain.money;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.Currency;
import org.junit.jupiter.api.Test;

class MoneyTest {

  @Test
  void shouldCreateMoney() {
    Money money = Money.of("100.00");

    assertThat(money.amount())
        .isEqualByComparingTo("100.00");

    assertThat(money.currency())
        .isEqualTo(Currency.getInstance("BRL"));
  }

  @Test
  void shouldNormalizeAmountToTwoDecimalPlaces() {
    Money money = Money.of("100");

    assertThat(money.amount())
        .isEqualByComparingTo("100.00");

    assertThat(money.amount().scale())
        .isEqualTo(2);
  }

  @Test
  void shouldNormalizeEquivalentAmountsToSameValue() {
    Money first = Money.of("100");
    Money second = Money.of("100.00");

    assertThat(first)
        .isEqualTo(second);
  }

  @Test
  void shouldCreateMoneyWithCustomCurrency() {
    Currency usd = Currency.getInstance("USD");

    Money money = Money.of("100.00", usd);

    assertThat(money.amount())
        .isEqualByComparingTo("100.00");

    assertThat(money.currency())
        .isEqualTo(usd);
  }

  @Test
  void shouldRejectNullAmount() {
    assertThatThrownBy(
        () -> new Money(null, Currency.getInstance("BRL"))
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Amount cannot be null");
  }

  @Test
  void shouldRejectNullCurrency() {
    assertThatThrownBy(
        () -> new Money(BigDecimal.TEN, null)
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Currency cannot be null");
  }

  @Test
  void shouldRejectMoreThanTwoDecimalPlaces() {
    assertThatThrownBy(() -> Money.of("100.001"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Amount cannot have more than 2 decimal places");
  }

  @Test
  void shouldAddTwoMoneyValues() {
    Money first = Money.of("100.00");
    Money second = Money.of("50.00");

    Money result = first.add(second);

    assertThat(result.amount())
        .isEqualByComparingTo("150.00");

    assertThat(result.currency())
        .isEqualTo(Currency.getInstance("BRL"));
  }

  @Test
  void shouldSubtractTwoMoneyValues() {
    Money first = Money.of("100.00");
    Money second = Money.of("30.00");

    Money result = first.subtract(second);

    assertThat(result.amount())
        .isEqualByComparingTo("70.00");

    assertThat(result.currency())
        .isEqualTo(Currency.getInstance("BRL"));
  }

  @Test
  void shouldRejectAdditionWithDifferentCurrencies() {
    Money brl = Money.of(
        "100.00",
        Currency.getInstance("BRL")
    );

    Money usd = Money.of(
        "50.00",
        Currency.getInstance("USD")
    );

    assertThatThrownBy(() -> brl.add(usd))
        .isInstanceOf(CurrencyMismatchException.class);
  }

  @Test
  void shouldRejectSubtractionWithDifferentCurrencies() {
    Money brl = Money.of(
        "100.00",
        Currency.getInstance("BRL")
    );

    Money usd = Money.of(
        "50.00",
        Currency.getInstance("USD")
    );

    assertThatThrownBy(() -> brl.subtract(usd))
        .isInstanceOf(CurrencyMismatchException.class);
  }

  @Test
  void shouldMultiplyMoneyByAnInteger() {
    Money money = Money.of("10.00");

    Money result = money.multiply(3);

    assertThat(result.amount())
        .isEqualByComparingTo("30.00");

    assertThat(result.currency())
        .isEqualTo(Currency.getInstance("BRL"));
  }

  @Test
  void shouldDivideMoneyByAnInteger() {
    Money money = Money.of("10.00");

    Money result = money.divide(4);

    assertThat(result.amount())
        .isEqualByComparingTo("2.50");

    assertThat(result.currency())
        .isEqualTo(Currency.getInstance("BRL"));
  }

  @Test
  void shouldRejectDivisionByZero() {
    Money money = Money.of("100.00");

    assertThatThrownBy(() -> money.divide(0))
        .isInstanceOf(ArithmeticException.class);
  }

  @Test
  void shouldNegateMoney() {
    Money money = Money.of("100.00");

    Money result = money.negate();

    assertThat(result.amount())
        .isEqualByComparingTo("-100.00");

    assertThat(result.currency())
        .isEqualTo(Currency.getInstance("BRL"));
  }

  @Test
  void shouldNegateNegativeMoney() {
    Money money = Money.of("-100.00");

    Money result = money.negate();

    assertThat(result.amount())
        .isEqualByComparingTo("100.00");
  }

  @Test
  void shouldAllowNegativeValues() {
    Money money = Money.of("-100.00");

    assertThat(money.amount())
        .isEqualByComparingTo("-100.00");

    assertThat(money.isNegative())
        .isTrue();
  }

  @Test
  void shouldAllowZero() {
    Money money = Money.of("0.00");

    assertThat(money.isZero())
        .isTrue();

    assertThat(money.isNegative())
        .isFalse();
  }

  @Test
  void shouldCreateZeroMoneyUsingDefaultCurrency() {
    Money money = Money.zero();

    assertThat(money.amount())
        .isEqualByComparingTo("0.00");

    assertThat(money.currency())
        .isEqualTo(Currency.getInstance("BRL"));
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

  @Test
  void shouldReturnFalseWhenValuesAreEqual() {
    Money first = Money.of("100.00");
    Money second = Money.of("100.00");

    assertThat(first.isGreaterThan(second))
        .isFalse();

    assertThat(first.isLessThan(second))
        .isFalse();
  }

  @Test
  void shouldPreserveImmutabilityWhenAdding() {
    Money original = Money.of("100.00");
    Money other = Money.of("50.00");

    Money result = original.add(other);

    assertThat(original.amount())
        .isEqualByComparingTo("100.00");

    assertThat(result.amount())
        .isEqualByComparingTo("150.00");
  }

  @Test
  void shouldPreserveImmutabilityWhenSubtracting() {
    Money original = Money.of("100.00");
    Money other = Money.of("30.00");

    Money result = original.subtract(other);

    assertThat(original.amount())
        .isEqualByComparingTo("100.00");

    assertThat(result.amount())
        .isEqualByComparingTo("70.00");
  }

  @Test
  void shouldPreserveImmutabilityWhenNegating() {
    Money original = Money.of("100.00");

    Money result = original.negate();

    assertThat(original.amount())
        .isEqualByComparingTo("100.00");

    assertThat(result.amount())
        .isEqualByComparingTo("-100.00");
  }

  @Test
  void shouldMultiplyMoneyByDecimal() {
    Money money = Money.of("100.00");

    Money result = money.multiply(new BigDecimal("1.15"));

    assertThat(result.amount())
        .isEqualByComparingTo("115.00");
  }

  @Test
  void shouldRejectNullMultiplier() {
    Money money = Money.of("100.00");

    assertThatThrownBy(() -> money.multiply(null))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Multiplier cannot be null");
  }

  @Test
  void shouldCreateZeroMoneyWithCustomCurrency() {
    Currency usd = Currency.getInstance("USD");

    Money money = Money.zero(usd);

    assertThat(money.amount())
        .isEqualByComparingTo("0.00");

    assertThat(money.currency())
        .isEqualTo(usd);
  }

  @Test
  void shouldRoundDivisionUsingHalfEven() {
    Money money = Money.of("1.00");

    Money result = money.divide(8);

    assertThat(result.amount())
        .isEqualByComparingTo("0.12");
  }

  @Test
  void shouldRoundDivisionUpWhenHalfIsReachedAndRetainedDigitIsOdd() {
    Money money = Money.of("1.00");

    Money result = money.divide(40);

    assertThat(result.amount())
        .isEqualByComparingTo("0.03");
  }

  @Test
  void shouldRoundHalfToEven() {
    Money money = Money.of("0.07");

    Money result = money.divide(2);

    assertThat(result.amount())
        .isEqualByComparingTo("0.04");
  }
}