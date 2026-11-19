import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isInvoicePayable,
  toPayCreditCardInvoiceInput,
  validateCreditCardPaymentForm,
  type CreditCardPaymentFormValues,
  type CreditCardPaymentValidationOptions,
} from './credit-card-payment-form.ts';
import { getCreditCardPaymentErrorMessage } from './credit-card-payment-errors.ts';

const accountId = 'account-1';

function values(
  overrides: Partial<CreditCardPaymentFormValues>,
): CreditCardPaymentFormValues {
  return {
    accountId,
    amount: 30,
    ...overrides,
  };
}

function options(
  overrides: Partial<CreditCardPaymentValidationOptions>,
): CreditCardPaymentValidationOptions {
  return {
    invoiceStatus: 'CLOSED',
    remainingAmount: 100,
    activeAccountIds: [accountId],
    ...overrides,
  };
}

test('somente faturas CLOSED ou PARTIALLY_PAID podem ser pagas', () => {
  assert.equal(isInvoicePayable('CLOSED'), true);
  assert.equal(isInvoicePayable('PARTIALLY_PAID'), true);
  assert.equal(isInvoicePayable('OPEN'), false);
  assert.equal(isInvoicePayable('PAID'), false);
});

test('aceita pagamento parcial válido', () => {
  assert.equal(
    validateCreditCardPaymentForm(values({ amount: 30 }), options({})),
    null,
  );
});

test('aceita pagamento integral do saldo restante', () => {
  assert.equal(
    validateCreditCardPaymentForm(
      values({ amount: 100 }),
      options({ invoiceStatus: 'PARTIALLY_PAID', remainingAmount: 100 }),
    ),
    null,
  );
});

test('recusa valor zero ou negativo', () => {
  assert.equal(
    validateCreditCardPaymentForm(values({ amount: 0 }), options({})),
    'Informe um valor de pagamento maior que zero.',
  );
  assert.equal(
    validateCreditCardPaymentForm(values({ amount: -10 }), options({})),
    'Informe um valor de pagamento maior que zero.',
  );
});

test('recusa valor superior ao saldo restante em centavos', () => {
  assert.equal(
    validateCreditCardPaymentForm(
      values({ amount: 100.01 }),
      options({ remainingAmount: 100 }),
    ),
    'O pagamento não pode ser superior ao saldo restante da fatura.',
  );
  assert.equal(
    validateCreditCardPaymentForm(
      values({ amount: 100.01 }),
      options({ remainingAmount: 100.01 }),
    ),
    null,
  );
});

test('exige conta bancária ativa de origem', () => {
  assert.equal(
    validateCreditCardPaymentForm(values({ accountId: '' }), options({})),
    'Selecione a conta bancária de origem.',
  );
  assert.equal(
    validateCreditCardPaymentForm(
      values({ accountId: 'inactive' }),
      options({}),
    ),
    'Selecione uma conta bancária ativa.',
  );
});

test('recusa faturas em estados não permitidos', () => {
  assert.equal(
    validateCreditCardPaymentForm(values({}), options({ invoiceStatus: 'OPEN' })),
    'Esta fatura não está disponível para pagamento.',
  );
  assert.equal(
    validateCreditCardPaymentForm(values({}), options({ invoiceStatus: 'PAID' })),
    'Esta fatura não está disponível para pagamento.',
  );
  assert.equal(
    validateCreditCardPaymentForm(
      values({}),
      options({ remainingAmount: 0, invoiceStatus: 'PARTIALLY_PAID' }),
    ),
    'Esta fatura não possui saldo restante.',
  );
});

test('monta o corpo do pagamento com idempotência', () => {
  assert.deepEqual(
    toPayCreditCardInvoiceInput(values({ amount: 42.5 }), {
      id: 'payment-id',
    }),
    {
      id: 'payment-id',
      accountId,
      amount: 42.5,
    },
  );

  assert.deepEqual(toPayCreditCardInvoiceInput(values({})), {
    accountId,
    amount: 30,
  });
});

test('recusa entrada inválida ao montar o pagamento', () => {
  assert.throws(
    () => toPayCreditCardInvoiceInput(values({ accountId: '' })),
    /Conta bancária de origem não informada/,
  );
  assert.throws(
    () => toPayCreditCardInvoiceInput(values({ amount: 0 })),
    /Valor de pagamento inválido/,
  );
});

test('traduz os principais status HTTP do pagamento', () => {
  const apiError = (status: number) =>
    Object.assign(new Error('API'), { status });

  assert.match(
    getCreditCardPaymentErrorMessage(apiError(400)),
    /Verifique o valor, o saldo restante/,
  );
  assert.match(
    getCreditCardPaymentErrorMessage(apiError(403)),
    /conta selecionada está inativa/,
  );
  assert.match(
    getCreditCardPaymentErrorMessage(apiError(404)),
    /não encontrada/,
  );
  assert.match(
    getCreditCardPaymentErrorMessage(apiError(409)),
    /estado da fatura mudou/,
  );
  assert.match(
    getCreditCardPaymentErrorMessage(apiError(500)),
    /servidor não conseguiu/,
  );
});
