import test from 'node:test';
import assert from 'node:assert/strict';

import {
  emptyCategoryForm,
  validateCategoryForm,
} from './categories.ts';

const categories = [
  { id: 'one', name: 'Alimentação' },
  { id: 'two', name: 'Salário' },
];

test('exige nome preenchido ao criar e editar', () => {
  assert.equal(
    validateCategoryForm(emptyCategoryForm, { categories }),
    'Informe o nome da categoria.',
  );

  assert.equal(
    validateCategoryForm(
      { name: '   ' },
      { categories, editingCategoryId: 'one' },
    ),
    'Informe o nome da categoria.',
  );
});

test('impede nomes duplicados sem diferenciar maiúsculas', () => {
  assert.equal(
    validateCategoryForm(
      { name: '  alimentação  ' },
      { categories },
    ),
    'Já existe uma categoria com esse nome.',
  );
});

test('permite manter o próprio nome ao editar', () => {
  assert.equal(
    validateCategoryForm(
      { name: 'Alimentação' },
      { categories, editingCategoryId: 'one' },
    ),
    null,
  );

  assert.equal(
    validateCategoryForm(
      { name: 'Transporte' },
      { categories, editingCategoryId: 'one' },
    ),
    null,
  );
});

test('aceita um nome novo e único', () => {
  assert.equal(
    validateCategoryForm({ name: 'Transporte' }, { categories }),
    null,
  );
});
