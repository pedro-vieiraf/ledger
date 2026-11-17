import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filterDesktopTransactions,
  getPeriodBounds,
  paginateTransactions,
  type DesktopTransactionFilters,
  type FilterableTransaction,
} from '../../../utils/desktop-transaction-filters.ts';

const REFERENCE = new Date(2026, 10, 10, 12);

function makeTransaction(
  overrides: Partial<FilterableTransaction> = {},
): FilterableTransaction {
  return {
    description: 'Mercado',
    categoryId: 'category-1',
    accountId: 'account-1',
    destinationAccountId: null,
    timestamp: new Date(2026, 10, 5, 10, 0).toISOString(),
    type: 'EXPENSE',
    ...overrides,
  };
}

function makeFilters(
  overrides: Partial<DesktopTransactionFilters> = {},
): DesktopTransactionFilters {
  return {
    query: '',
    period: 'all',
    accountId: 'all',
    categoryId: 'all',
    type: 'all',
    customStart: '',
    customEnd: '',
    ...overrides,
  };
}

test('calcula os limites do mês atual', () => {
  const bounds = getPeriodBounds('current-month', REFERENCE);

  assert.equal(bounds.start?.getDate(), 1);
  assert.equal(bounds.start?.getMonth(), 10);
  assert.equal(bounds.endExclusive?.getMonth(), 11);
});

test('calcula os últimos 3 meses incluindo o mês atual', () => {
  const bounds = getPeriodBounds('last-3-months', REFERENCE);

  assert.equal(bounds.start?.getMonth(), 8);
  assert.equal(bounds.start?.getFullYear(), 2026);
  assert.equal(bounds.endExclusive?.getMonth(), 11);
});

test('inclui o dia final no período personalizado', () => {
  const bounds = getPeriodBounds(
    'custom',
    REFERENCE,
    '01/10/2026',
    '31/10/2026',
  );

  assert.equal(bounds.start?.getDate(), 1);
  assert.equal(bounds.endExclusive?.getMonth(), 10);
  assert.equal(bounds.endExclusive?.getDate(), 1);
});

test('combina pesquisa, tipo, conta, categoria e período', () => {
  const transactions = [
    makeTransaction(),
    makeTransaction({ description: 'Farmácia' }),
    makeTransaction({ type: 'INCOME' }),
    makeTransaction({ accountId: 'account-2' }),
    makeTransaction({ categoryId: 'category-2' }),
    makeTransaction({
      timestamp: new Date(2026, 9, 5, 10, 0).toISOString(),
    }),
  ];

  const filters = makeFilters({
    query: 'merc',
    type: 'expense',
    accountId: 'account-1',
    categoryId: 'category-1',
    period: 'current-month',
  });

  const result = filterDesktopTransactions(transactions, filters, REFERENCE);

  assert.equal(result.length, 1);
  assert.equal(result[0].description, 'Mercado');
});

test('filtra transferências pela conta de destino', () => {
  const transactions = [
    makeTransaction({
      type: 'TRANSFER',
      categoryId: null,
      accountId: 'account-1',
      destinationAccountId: 'account-2',
      description: 'Entre contas',
    }),
  ];

  const result = filterDesktopTransactions(
    transactions,
    makeFilters({ accountId: 'account-2' }),
    REFERENCE,
  );

  assert.equal(result.length, 1);
});

test('filtro de categoria não mistura transferências', () => {
  const transactions = [
    makeTransaction({
      type: 'TRANSFER',
      categoryId: null,
      description: 'Transferência',
    }),
    makeTransaction({
      categoryId: null,
      description: 'Sem categoria',
    }),
    makeTransaction({ description: 'Com categoria' }),
  ];

  const uncategorized = filterDesktopTransactions(
    transactions,
    makeFilters({ categoryId: 'uncategorized' }),
    REFERENCE,
  );

  assert.deepEqual(
    uncategorized.map((transaction) => transaction.description),
    ['Sem categoria'],
  );
});

test('pagina e limita a página ao total disponível', () => {
  const transactions = Array.from({ length: 25 }, (_, index) =>
    makeTransaction({ description: `Transação ${index + 1}` }),
  );

  const firstPage = paginateTransactions(transactions, 1, 10);
  const lastPage = paginateTransactions(transactions, 99, 10);

  assert.equal(firstPage.items.length, 10);
  assert.equal(firstPage.page, 1);
  assert.equal(firstPage.rangeStart, 1);
  assert.equal(firstPage.rangeEnd, 10);
  assert.equal(firstPage.pageCount, 3);

  assert.equal(lastPage.page, 3);
  assert.equal(lastPage.items.length, 5);
  assert.equal(lastPage.rangeStart, 21);
  assert.equal(lastPage.rangeEnd, 25);
});
