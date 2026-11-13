import test from 'node:test';
import assert from 'node:assert/strict';

import {
  emptyAccountForm,
  formatAccountType,
  validateAccountForm,
} from './accounts.ts';

test('exige nome preenchido ao criar e editar', () => {
  assert.equal(
    validateAccountForm(
      { ...emptyAccountForm, openingBalance: 10 },
      { isEditing: false },
    ),
    'Informe o nome da conta.',
  );

  assert.equal(
    validateAccountForm(
      { name: '   ', type: 'SAVINGS', openingBalance: 0 },
      { isEditing: true },
    ),
    'Informe o nome da conta.',
  );
});

test('valida saldo inicial apenas na criação', () => {
  assert.equal(
    validateAccountForm(
      { name: 'Conta', type: 'CHECKING', openingBalance: -1 },
      { isEditing: false },
    ),
    'Informe um saldo inicial válido.',
  );

  assert.equal(
    validateAccountForm(
      { name: 'Conta', type: 'CHECKING', openingBalance: Number.NaN },
      { isEditing: false },
    ),
    'Informe um saldo inicial válido.',
  );

  assert.equal(
    validateAccountForm(
      { name: 'Conta', type: 'CHECKING', openingBalance: -1 },
      { isEditing: true },
    ),
    null,
  );
});

test('aceita formulário válido', () => {
  assert.equal(
    validateAccountForm(
      { name: 'Conta principal', type: 'CHECKING', openingBalance: 0 },
      { isEditing: false },
    ),
    null,
  );
});

test('formata os tipos de conta do backend', () => {
  assert.equal(formatAccountType('CHECKING'), 'Conta corrente');
  assert.equal(formatAccountType('SAVINGS'), 'Poupança');
});
