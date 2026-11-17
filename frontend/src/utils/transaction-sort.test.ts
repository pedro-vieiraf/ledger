import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compareTransactionsByTimestampDescending,
  sortTransactionsByTimestampDescending,
} from './transaction-sort.ts';

type Item = {
  id: string;
  timestamp: string;
};

function localIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
) {
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

function ids(items: readonly Item[]) {
  return items.map((item) => item.id);
}

test('ordena transações do mesmo dia pelo horário, mais recentes primeiro', () => {
  const items: Item[] = [
    { id: 'almoco', timestamp: localIso(2026, 5, 10, 12, 30) },
    { id: 'manha', timestamp: localIso(2026, 5, 10, 9, 0) },
    { id: 'noite', timestamp: localIso(2026, 5, 10, 18, 15) },
  ];

  assert.deepEqual(ids(sortTransactionsByTimestampDescending(items)), [
    'noite',
    'almoco',
    'manha',
  ]);
});

test('reposiciona a transação quando a data/hora é editada', () => {
  const original: Item[] = [
    { id: 'editada', timestamp: localIso(2026, 5, 10, 10, 0) },
    { id: 'outra', timestamp: localIso(2026, 5, 10, 14, 0) },
  ];

  const movedToEnd = original.map((item) =>
    item.id === 'editada'
      ? { ...item, timestamp: localIso(2026, 5, 10, 8, 0) }
      : item,
  );

  assert.deepEqual(ids(sortTransactionsByTimestampDescending(movedToEnd)), [
    'outra',
    'editada',
  ]);

  const movedToStart = original.map((item) =>
    item.id === 'editada'
      ? { ...item, timestamp: localIso(2026, 5, 10, 20, 0) }
      : item,
  );

  assert.deepEqual(ids(sortTransactionsByTimestampDescending(movedToStart)), [
    'editada',
    'outra',
  ]);
});

test('ordena dias diferentes pela data antes do horário', () => {
  const items: Item[] = [
    { id: 'ontem-tarde', timestamp: localIso(2026, 5, 9, 23, 0) },
    { id: 'hoje-manha', timestamp: localIso(2026, 5, 10, 6, 0) },
    { id: 'hoje-noite', timestamp: localIso(2026, 5, 10, 21, 0) },
  ];

  assert.deepEqual(ids(sortTransactionsByTimestampDescending(items)), [
    'hoje-noite',
    'hoje-manha',
    'ontem-tarde',
  ]);
});

test('mantém timestamps inválidos ao final da lista', () => {
  const items: Item[] = [
    { id: 'invalida', timestamp: 'data-invalida' },
    { id: 'valida', timestamp: localIso(2026, 5, 10, 10, 0) },
  ];

  assert.deepEqual(ids(sortTransactionsByTimestampDescending(items)), [
    'valida',
    'invalida',
  ]);
});

test('usa o identificador como desempate estável', () => {
  const timestamp = localIso(2026, 5, 10, 10, 0);
  const first: Item = { id: 'a', timestamp };
  const second: Item = { id: 'b', timestamp };

  assert.ok(
    compareTransactionsByTimestampDescending(first, second) > 0,
  );
  assert.ok(
    compareTransactionsByTimestampDescending(second, first) < 0,
  );
  assert.equal(
    compareTransactionsByTimestampDescending(first, { ...first }),
    0,
  );
});
