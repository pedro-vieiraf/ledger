import test from 'node:test';
import assert from 'node:assert/strict';

import type { Recurrence } from '@/services/recurrences-api';
import {
  MAX_UPCOMING_COMMITMENTS,
  getUpcomingCommitments,
} from './upcoming-commitments.ts';

function recurrence(overrides: Partial<Recurrence>): Recurrence {
  return {
    id: 'recurrence',
    amount: 100,
    currency: 'BRL',
    type: 'EXPENSE',
    description: 'Assinatura',
    accountId: 'account',
    categoryId: null,
    frequency: 'MONTHLY',
    startDate: '2026-01-01',
    nextOccurrence: '2026-12-01',
    status: 'ACTIVE',
    ...overrides,
  };
}

const TODAY = new Date(2026, 10, 19);

test('considera apenas despesas ativas com próxima ocorrência futura', () => {
  const items = getUpcomingCommitments(
    [
      recurrence({ id: 'expense', nextOccurrence: '2026-12-01' }),
      recurrence({
        id: 'income',
        type: 'INCOME',
        nextOccurrence: '2026-11-25',
      }),
      recurrence({
        id: 'inactive',
        status: 'INACTIVE',
        nextOccurrence: '2026-11-21',
      }),
      recurrence({ id: 'past', nextOccurrence: '2026-11-18' }),
      recurrence({ id: 'today', nextOccurrence: '2026-11-19' }),
    ],
    TODAY,
  );

  assert.deepEqual(
    items.map((item) => item.id),
    ['today', 'expense'],
  );
});

test('ordena cronologicamente e limita aos quatro compromissos mais próximos', () => {
  const items = getUpcomingCommitments(
    [
      recurrence({ id: 'fifth', nextOccurrence: '2027-02-10' }),
      recurrence({ id: 'fourth', nextOccurrence: '2027-01-10' }),
      recurrence({ id: 'second', nextOccurrence: '2026-12-05' }),
      recurrence({ id: 'first', nextOccurrence: '2026-11-25' }),
      recurrence({ id: 'third', nextOccurrence: '2026-12-20' }),
    ],
    TODAY,
  );

  assert.equal(items.length, MAX_UPCOMING_COMMITMENTS);
  assert.deepEqual(
    items.map((item) => item.id),
    ['first', 'second', 'third', 'fourth'],
  );
});

test('desempata ocorrências na mesma data pelo identificador', () => {
  const items = getUpcomingCommitments(
    [
      recurrence({ id: 'b', nextOccurrence: '2026-12-05' }),
      recurrence({ id: 'a', nextOccurrence: '2026-12-05' }),
    ],
    TODAY,
  );

  assert.deepEqual(
    items.map((item) => item.id),
    ['a', 'b'],
  );
});

test('retorna lista vazia quando não há compromissos futuros', () => {
  assert.deepEqual(
    getUpcomingCommitments(
      [
        recurrence({
          id: 'inactive',
          status: 'INACTIVE',
          nextOccurrence: '2026-12-01',
        }),
      ],
      TODAY,
    ),
    [],
  );
});
