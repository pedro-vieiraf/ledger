import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createEmptyCreditCardPurchaseForm,
  parseInstallmentCount,
  toCreateCreditCardPurchaseInput,
  validateCreditCardPurchaseForm,
  type CreditCardPurchaseFormValues,
} from './credit-card-purchase-form.ts';

function values(
  overrides: Partial<CreditCardPurchaseFormValues>,
): CreditCardPurchaseFormValues {
  return {
    description: 'Mercado',
    amount: 120.5,
    purchaseDate: '18/11/2026',
    modality: 'single',
    installmentCount: '2',
    ...overrides,
  };
}

test('inicia o formulário com a data de hoje e compra à vista', () => {
  const form = createEmptyCreditCardPurchaseForm(
    new Date(2026, 10, 18, 15, 30),
  );

  assert.equal(form.purchaseDate, '18/11/2026');
  assert.equal(form.modality, 'single');
  assert.equal(form.amount, 0);
  assert.equal(form.description, '');
});

test('interpreta a quantidade de parcelas', () => {
  assert.equal(parseInstallmentCount('6'), 6);
  assert.equal(parseInstallmentCount(' 12 '), 12);
  assert.equal(parseInstallmentCount('0'), null);
  assert.equal(parseInstallmentCount('1'), 1);
  assert.equal(parseInstallmentCount('100'), null);
  assert.equal(parseInstallmentCount('2x'), null);
  assert.equal(parseInstallmentCount(''), null);
});

test('valida os campos obrigatórios da compra', () => {
  assert.equal(
    validateCreditCardPurchaseForm(values({ description: '   ' })),
    'Informe a descrição da compra.',
  );
  assert.equal(
    validateCreditCardPurchaseForm(values({ amount: 0 })),
    'Informe um valor total maior que zero.',
  );
  assert.equal(
    validateCreditCardPurchaseForm(values({ purchaseDate: '31/02/2026' })),
    'Informe uma data de compra válida.',
  );
  assert.equal(validateCreditCardPurchaseForm(values({})), null);
});

test('valida a quantidade de parcelas sem calcular valores', () => {
  assert.equal(
    validateCreditCardPurchaseForm(
      values({ modality: 'installments', installmentCount: '1' }),
    ),
    'Informe uma quantidade de parcelas válida, de 2 a 99.',
  );

  assert.equal(
    validateCreditCardPurchaseForm(
      values({ amount: 0.5, modality: 'installments', installmentCount: '51' }),
    ),
    'A quantidade de parcelas não pode ser maior que o valor da compra em centavos.',
  );

  assert.equal(
    validateCreditCardPurchaseForm(
      values({ amount: 0.5, modality: 'installments', installmentCount: '50' }),
    ),
    null,
  );
});

test('monta o corpo do POST com data ISO e idempotência', () => {
  assert.deepEqual(
    toCreateCreditCardPurchaseInput(values({ description: '  Farmácia  ' }), {
      id: 'purchase-id',
    }),
    {
      id: 'purchase-id',
      description: 'Farmácia',
      amount: 120.5,
      purchaseDate: '2026-11-18',
      installmentCount: 1,
    },
  );

  assert.deepEqual(
    toCreateCreditCardPurchaseInput(
      values({
        modality: 'installments',
        installmentCount: '4',
      }),
    ),
    {
      description: 'Mercado',
      amount: 120.5,
      purchaseDate: '2026-11-18',
      installmentCount: 4,
    },
  );
});

test('recusa entrada inválida ao montar o corpo do POST', () => {
  assert.throws(
    () => toCreateCreditCardPurchaseInput(values({ purchaseDate: '31/02/2026' })),
    /Data da compra inválida/,
  );

  assert.throws(
    () =>
      toCreateCreditCardPurchaseInput(
        values({ modality: 'installments', installmentCount: '0' }),
      ),
    /Quantidade de parcelas inválida/,
  );
});
