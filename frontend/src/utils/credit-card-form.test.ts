import test from 'node:test';
import assert from 'node:assert/strict';

import type { CreditCard } from '@/services/credit-cards-api';
import {
  CLOSING_DAY_LOCKED_MESSAGE,
  getCreditCardErrorMessage,
} from './credit-card-errors.ts';
import {
  buildCreditCardUpdateInput,
  emptyCreditCardForm,
  parseCreditCardDay,
  toCreateCreditCardInput,
  validateCreditCardForm,
  type CreditCardFormValues,
} from './credit-card-form.ts';

function creditCard(overrides: Partial<CreditCard>): CreditCard {
  return {
    id: 'card',
    name: 'Cartão principal',
    issuer: 'Banco',
    creditLimit: 5000,
    availableLimit: 4000,
    closingDay: 20,
    dueDay: 28,
    status: 'ACTIVE',
    currency: 'BRL',
    ...overrides,
  };
}

function form(overrides: Partial<CreditCardFormValues>): CreditCardFormValues {
  return {
    name: 'Cartão principal',
    issuer: 'Banco',
    creditLimit: 5000,
    closingDay: '20',
    dueDay: '28',
    currency: 'BRL',
    ...overrides,
  };
}

test('valida os campos obrigatórios do cartão', () => {
  assert.equal(
    validateCreditCardForm(form({ name: '  ' })),
    'Informe o nome ou a identificação do cartão.',
  );
  assert.equal(
    validateCreditCardForm(form({ issuer: '' })),
    'Informe a instituição emissora.',
  );
  assert.equal(
    validateCreditCardForm(form({ creditLimit: 0 })),
    'Informe um limite total maior que zero.',
  );
  assert.equal(
    validateCreditCardForm(form({ closingDay: '' })),
    'Informe um dia de fechamento entre 1 e 31.',
  );
  assert.equal(
    validateCreditCardForm(form({ dueDay: '32' })),
    'Informe um dia de vencimento entre 1 e 31.',
  );
  assert.equal(validateCreditCardForm(form({})), null);
});

test('aceita dias entre 1 e 31 apenas como número inteiro', () => {
  assert.equal(parseCreditCardDay('1'), 1);
  assert.equal(parseCreditCardDay(' 31 '), 31);
  assert.equal(parseCreditCardDay('0'), null);
  assert.equal(parseCreditCardDay('32'), null);
  assert.equal(parseCreditCardDay('10.5'), null);
  assert.equal(parseCreditCardDay('abc'), null);
  assert.equal(parseCreditCardDay(''), null);
});

test('impede limite menor que o valor comprometido', () => {
  assert.equal(
    validateCreditCardForm(form({ creditLimit: 999.99 }), {
      committedLimit: 1000,
    }),
    'O limite não pode ser menor que o valor comprometido do cartão.',
  );
  assert.equal(
    validateCreditCardForm(form({ creditLimit: 1000 }), {
      committedLimit: 1000,
    }),
    null,
  );
});

test('monta a criação com dados normalizados e moeda BRL', () => {
  assert.deepEqual(
    toCreateCreditCardInput(
      form({
        name: '  Cartão principal  ',
        issuer: '  Banco  ',
        creditLimit: 2500.75,
        closingDay: '5',
        dueDay: '15',
      }),
    ),
    {
      name: 'Cartão principal',
      issuer: 'Banco',
      creditLimit: 2500.75,
      closingDay: 5,
      dueDay: 15,
      currency: 'BRL',
    },
  );
});

test('envia apenas campos alterados no PATCH e nunca a moeda', () => {
  const card = creditCard({});

  assert.deepEqual(buildCreditCardUpdateInput(card, form({})), {});

  assert.deepEqual(
    buildCreditCardUpdateInput(
      card,
      form({
        name: 'Novo nome',
        creditLimit: 6000,
        closingDay: '21',
        currency: 'USD',
      }),
    ),
    {
      name: 'Novo nome',
      creditLimit: 6000,
      closingDay: 21,
    },
  );

  assert.deepEqual(
    buildCreditCardUpdateInput(
      card,
      form({ issuer: 'Outro banco', dueDay: '29' }),
    ),
    {
      issuer: 'Outro banco',
      dueDay: 29,
    },
  );
});

test('compara o limite em centavos ao montar o PATCH', () => {
  const card = creditCard({ creditLimit: 1000.1 });

  assert.deepEqual(
    buildCreditCardUpdateInput(card, form({ creditLimit: 1000.1 })),
    {},
  );
});

test('formulário vazio inicia com a moeda padrão', () => {
  assert.equal(emptyCreditCardForm.currency, 'BRL');
  assert.equal(emptyCreditCardForm.creditLimit, 0);
});

test('mapeia o 409 da atualização para o bloqueio de fechamento', () => {
  assert.equal(
    getCreditCardErrorMessage({ status: 409 }, 'update'),
    CLOSING_DAY_LOCKED_MESSAGE,
  );
  assert.match(
    getCreditCardErrorMessage({ status: 409 }, 'deactivate'),
    /não pôde ser desativado/,
  );
  assert.match(
    getCreditCardErrorMessage({ status: 409 }, 'reactivate'),
    /não pôde ser reativado/,
  );
});

test('mapeia os demais status e preserva mensagens de conexão', () => {
  assert.match(
    getCreditCardErrorMessage({ status: 404 }, 'create'),
    /não encontrado/,
  );
  assert.match(
    getCreditCardErrorMessage({ status: 403 }, 'update'),
    /inativo/,
  );
  assert.match(
    getCreditCardErrorMessage({ status: 400 }, 'create'),
    /Verifique os dados/,
  );
  assert.match(
    getCreditCardErrorMessage({ status: 500 }, 'create'),
    /servidor/,
  );
  assert.equal(
    getCreditCardErrorMessage(
      new Error('Não foi possível conectar ao servidor.'),
      'create',
    ),
    'Não foi possível conectar ao servidor.',
  );
});
