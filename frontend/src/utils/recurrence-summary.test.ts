import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filterRecurrences,
  summarizeRecurrences,
  UPCOMING_WINDOW_DAYS,
  type SummarizableRecurrence,
} from './recurrence-summary.ts';

const TODAY = new Date(2026, 10, 11, 9);

function makeRecurrence(
  overrides: Partial<SummarizableRecurrence> = {},
): SummarizableRecurrence {
  return {
    amount: 100,
    currency: 'BRL',
    type: 'EXPENSE',
    description: 'Assinatura',
    accountId: 'account-1',
    categoryId: null,
    frequency: 'MONTHLY',
    nextOccurrence: '2026-11-15',
    status: 'ACTIVE',
    ...overrides,
  };
}

test('resume apenas despesas mensais ativas em BRL no valor recorrente', () => {
  const summary = summarizeRecurrences(
    [
      makeRecurrence({ amount: 99.9 }),
      makeRecurrence({ amount: 0.1, description: 'Outra assinatura' }),
      makeRecurrence({ amount: 50, type: 'INCOME' }),
      makeRecurrence({ amount: 30, frequency: 'YEARLY' }),
      makeRecurrence({ amount: 20, currency: 'USD' }),
      makeRecurrence({ amount: 10, status: 'INACTIVE' }),
    ],
    TODAY,
  );

  assert.equal(summary.totalCount, 6);
  assert.equal(summary.activeCount, 5);
  assert.equal(summary.inactiveCount, 1);
  assert.equal(summary.monthlyExpenseCount, 2);
  assert.equal(summary.monthlyExpenseTotal, 100);
});

test('conta próximas ocorrências dentro da janela de 30 dias', () => {
  const summary = summarizeRecurrences(
    [
      makeRecurrence({ nextOccurrence: '2026-11-11' }),
      makeRecurrence({ nextOccurrence: '2026-12-11' }),
      makeRecurrence({ nextOccurrence: '2026-12-12' }),
      makeRecurrence({ nextOccurrence: '2026-11-10' }),
      makeRecurrence({ nextOccurrence: 'data-invalida' }),
    ],
    TODAY,
  );

  assert.equal(summary.upcomingWindowDays, UPCOMING_WINDOW_DAYS);
  assert.equal(summary.upcomingCount, 2);
});

test('não conta ocorrências futuras de assinaturas inativas', () => {
  const summary = summarizeRecurrences(
    [
      makeRecurrence({ status: 'INACTIVE', nextOccurrence: '2026-11-20' }),
      makeRecurrence({ status: 'ACTIVE', nextOccurrence: '2026-11-21' }),
    ],
    TODAY,
  );

  assert.equal(summary.upcomingCount, 1);
});

test('filtra por situação, busca por descrição e conta', () => {
  const accountNameById = new Map([
    ['account-1', 'Conta principal'],
    ['account-2', 'Reserva'],
  ]);
  const recurrences = [
    makeRecurrence({
      description: 'Streaming',
      accountId: 'account-1',
      status: 'INACTIVE',
      nextOccurrence: '2026-11-12',
    }),
    makeRecurrence({
      description: 'Academia',
      accountId: 'account-2',
      status: 'ACTIVE',
      nextOccurrence: '2026-11-20',
    }),
    makeRecurrence({
      description: 'Aluguel',
      accountId: 'account-1',
      status: 'ACTIVE',
      nextOccurrence: '2026-11-15',
    }),
  ];

  const active = filterRecurrences(recurrences, {
    query: '',
    status: 'ACTIVE',
    accountNameById,
  });

  assert.deepEqual(
    active.map((recurrence) => recurrence.description),
    ['Aluguel', 'Academia'],
  );

  const byAccount = filterRecurrences(recurrences, {
    query: 'reserva',
    status: 'all',
    accountNameById,
  });

  assert.deepEqual(
    byAccount.map((recurrence) => recurrence.description),
    ['Academia'],
  );

  const byDescription = filterRecurrences(recurrences, {
    query: 'stream',
    status: 'all',
    accountNameById,
  });

  assert.deepEqual(
    byDescription.map((recurrence) => recurrence.description),
    ['Streaming'],
  );
});

test('ordena ativas primeiro e depois pela próxima ocorrência', () => {
  const recurrences = [
    makeRecurrence({
      description: 'Inativa',
      status: 'INACTIVE',
      nextOccurrence: '2026-11-12',
    }),
    makeRecurrence({
      description: 'Ativa depois',
      status: 'ACTIVE',
      nextOccurrence: '2026-11-20',
    }),
    makeRecurrence({
      description: 'Ativa antes',
      status: 'ACTIVE',
      nextOccurrence: '2026-11-15',
    }),
  ];

  const sorted = filterRecurrences(recurrences, {
    query: '',
    status: 'all',
    accountNameById: new Map(),
  });

  assert.deepEqual(
    sorted.map((recurrence) => recurrence.description),
    ['Ativa antes', 'Ativa depois', 'Inativa'],
  );
});
