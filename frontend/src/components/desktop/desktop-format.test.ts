import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCurrencyAxis,
  formatCompactCurrency,
} from './desktop-format.ts';

function normalizeSpaces(value: string) {
  return value.replace(/\u00A0/g, ' ');
}

test('formata o eixo monetário em BRL com abreviações compactas', () => {
  assert.equal(normalizeSpaces(formatCompactCurrency(250)), 'R$ 250');
  assert.equal(normalizeSpaces(formatCompactCurrency(1000)), 'R$ 1 mil');
  assert.equal(normalizeSpaces(formatCompactCurrency(1500)), 'R$ 1,5 mil');
});

test('calcula uma escala monetária dinâmica com passos arredondados', () => {
  assert.deepEqual(buildCurrencyAxis(1234), {
    max: 1500,
    ticks: [0, 500, 1000, 1500],
  });

  assert.deepEqual(buildCurrencyAxis(900), {
    max: 1000,
    ticks: [0, 250, 500, 750, 1000],
  });
});

test('mantém uma escala padrão quando não há valores no período', () => {
  assert.deepEqual(buildCurrencyAxis(0), {
    max: 100,
    ticks: [0, 25, 50, 75, 100],
  });
});
