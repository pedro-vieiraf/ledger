import test from 'node:test';
import assert from 'node:assert/strict';

import type { Account } from '@/services/accounts-api';
import type { Transaction } from '@/services/transactions-api';
import {
  filterTransactionsByMonth,
  getActiveAccounts,
  summarizeTransactions,
  sumAccountBalances,
} from './financial-summary.ts';

function account(overrides: Partial<Account>): Account {
  return {
    id: 'account',
    name: 'Conta',
    type: 'CHECKING',
    status: 'ACTIVE',
    balance: 0,
    ...overrides,
  };
}

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'transaction',
    amount: 0,
    currency: 'BRL',
    type: 'EXPENSE',
    description: null,
    timestamp: new Date(2026, 10, 9, 12).toISOString(),
    source: 'MANUAL',
    accountId: 'account',
    destinationAccountId: null,
    categoryId: null,
    recurrenceId: null,
    occurrenceDate: null,
    ...overrides,
  };
}

test('resume receitas e despesas em reais, sem transferências', () => {
  const summary = summarizeTransactions([
    transaction({ id: 'income', type: 'INCOME', amount: 1500.5 }),
    transaction({ id: 'expense', type: 'EXPENSE', amount: 500.25 }),
    transaction({ id: 'transfer', type: 'TRANSFER', amount: 300 }),
    transaction({ id: 'usd', type: 'INCOME', amount: 100, currency: 'USD' }),
  ]);

  assert.deepEqual(summary, {
    income: 1500.5,
    expense: 500.25,
    result: 1000.25,
  });
});

test('filtra transações pelo mês local e descarta datas inválidas', () => {
  const month = new Date(2026, 10, 1);
  const filtered = filterTransactionsByMonth(
    [
      transaction({
        id: 'november',
        timestamp: new Date(2026, 10, 15, 9).toISOString(),
      }),
      transaction({
        id: 'october',
        timestamp: new Date(2026, 9, 31, 23).toISOString(),
      }),
      transaction({ id: 'invalid', timestamp: 'data-invalida' }),
    ],
    month,
  );

  assert.deepEqual(
    filtered.map((item) => item.id),
    ['november'],
  );
});

test('considera apenas contas ativas e soma os saldos em centavos', () => {
  const accounts = [
    account({ id: 'checking', balance: 1200.35 }),
    account({ id: 'savings', type: 'SAVINGS', balance: 800.65 }),
    account({ id: 'inactive', status: 'INACTIVE', balance: 999 }),
    account({ id: 'deleted', status: 'DELETED', balance: 999 }),
  ];

  const activeAccounts = getActiveAccounts(accounts);

  assert.deepEqual(
    activeAccounts.map((item) => item.id),
    ['checking', 'savings'],
  );
  assert.equal(sumAccountBalances(activeAccounts), 2001);
});
