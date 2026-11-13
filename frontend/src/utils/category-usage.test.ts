import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCategoryUsage,
  groupCategoriesByUsage,
} from './category-usage.ts';

const categories = [
  { id: 'salary', name: 'Salário' },
  { id: 'food', name: 'Alimentação' },
  { id: 'mixed', name: 'Reembolso' },
  { id: 'unused', name: 'Viagem' },
];

test('deriva o uso real das transações e ignora transferências', () => {
  const usage = buildCategoryUsage([
    { type: 'INCOME', categoryId: 'salary' },
    { type: 'EXPENSE', categoryId: 'food' },
    { type: 'INCOME', categoryId: 'mixed' },
    { type: 'EXPENSE', categoryId: 'mixed' },
    { type: 'TRANSFER', categoryId: 'unused' },
    { type: 'INCOME', categoryId: null },
  ]);

  assert.deepEqual(usage.get('salary'), {
    income: true,
    expense: false,
  });
  assert.deepEqual(usage.get('food'), {
    income: false,
    expense: true,
  });
  assert.deepEqual(usage.get('mixed'), {
    income: true,
    expense: true,
  });
  assert.equal(usage.has('unused'), false);
});

test('agrupa categorias em receitas, despesas e sem uso', () => {
  const usage = buildCategoryUsage([
    { type: 'INCOME', categoryId: 'salary' },
    { type: 'EXPENSE', categoryId: 'food' },
    { type: 'INCOME', categoryId: 'mixed' },
    { type: 'EXPENSE', categoryId: 'mixed' },
  ]);

  const grouped = groupCategoriesByUsage(categories, usage);

  assert.deepEqual(
    grouped.income.map((category) => category.id),
    ['salary', 'mixed'],
  );
  assert.deepEqual(
    grouped.expense.map((category) => category.id),
    ['food', 'mixed'],
  );
  assert.deepEqual(
    grouped.unused.map((category) => category.id),
    ['unused'],
  );
});

test('mantém todas as categorias sem uso quando não há transações', () => {
  const grouped = groupCategoriesByUsage(categories, new Map());

  assert.deepEqual(grouped.income, []);
  assert.deepEqual(grouped.expense, []);
  assert.deepEqual(
    grouped.unused.map((category) => category.id),
    ['salary', 'food', 'mixed', 'unused'],
  );
});
