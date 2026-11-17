import test from 'node:test';
import assert from 'node:assert/strict';

import { MASKED_MONEY, maskMoney } from './privacy.ts';

test('maskMoney mantém o texto formatado quando os valores estão visíveis', () => {
  assert.equal(maskMoney('R$ 1.234,56', false), 'R$ 1.234,56');
});

test('maskMoney substitui qualquer valor formatado quando está oculto', () => {
  assert.equal(maskMoney('R$ 1.234,56', true), MASKED_MONEY);
  assert.equal(maskMoney('+ R$ 10,00', true), MASKED_MONEY);
});
