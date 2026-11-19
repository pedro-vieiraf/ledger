import test from 'node:test';
import assert from 'node:assert/strict';

import type { CreditCard } from '@/services/credit-cards-api';
import type { CreditCardInvoice } from '@/services/credit-card-invoices-api';
import type { CreditCardPurchase } from '@/services/credit-card-purchases-api';
import {
  CARD_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  PURCHASE_STATUS_LABELS,
  buildInvoiceEvolution,
  findCurrentInvoice,
  findOutstandingInvoice,
  findPurchaseInstallment,
  formatDateKey,
  formatEvolutionPeriod,
  formatInstallmentCount,
  formatInstallmentPosition,
  formatInvoiceCycle,
  formatMonthYear,
  formatTimestamp,
  fromCents,
  getCommittedLimit,
  getDashboardCardEntries,
  getInvoiceHighlight,
  getOutstandingInvoiceEntries,
  getPendingInvoices,
  getUsageRatio,
  getVisibleInvoiceEntries,
  isInvoiceOverdue,
  sortInvoicesChronologically,
  sortPaymentsByPaidAtDescending,
  summarizeInvoiceEntries,
  summarizeLimits,
  summarizePendingInvoices,
  toCents,
  toDateKey,
  trimEvolutionToData,
} from './credit-cards.ts';

function creditCard(overrides: Partial<CreditCard>): CreditCard {
  return {
    id: 'card',
    name: 'Cartão',
    issuer: 'Banco',
    creditLimit: 0,
    availableLimit: 0,
    closingDay: 1,
    dueDay: 10,
    status: 'ACTIVE',
    currency: 'BRL',
    ...overrides,
  };
}

function invoice(overrides: Partial<CreditCardInvoice>): CreditCardInvoice {
  return {
    id: 'invoice',
    cardId: 'card',
    cycleStart: '2026-06-01',
    cycleEnd: '2026-06-30',
    closingDate: '2026-06-30',
    dueDate: '2026-07-10',
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
    status: 'OPEN',
    currency: 'BRL',
    ...overrides,
  };
}

test('converte valores monetários em centavos sem imprecisão', () => {
  assert.equal(toCents(0.1 + 0.2), 30);
  assert.equal(toCents(1234.56), 123456);
  assert.equal(fromCents(123456), 1234.56);
  assert.equal(fromCents(toCents(10.07)), 10.07);
  assert.equal(toCents(Number.NaN), 0);
  assert.equal(fromCents(Number.POSITIVE_INFINITY), 0);
});

test('calcula o limite comprometido com os valores do backend', () => {
  assert.equal(
    getCommittedLimit(
      creditCard({ creditLimit: 5000, availableLimit: 3210.45 }),
    ),
    1789.55,
  );

  // O disponível nunca deve gerar limite comprometido negativo.
  assert.equal(
    getCommittedLimit(
      creditCard({ creditLimit: 1000, availableLimit: 1200 }),
    ),
    0,
  );
});

test('calcula a proporção de uso do limite entre 0 e 1', () => {
  assert.equal(
    getUsageRatio(creditCard({ creditLimit: 1000, availableLimit: 250 })),
    0.75,
  );
  assert.equal(
    getUsageRatio(creditCard({ creditLimit: 0, availableLimit: 0 })),
    0,
  );
  assert.equal(
    getUsageRatio(creditCard({ creditLimit: 1000, availableLimit: -100 })),
    1,
  );
  assert.equal(
    getUsageRatio(creditCard({ creditLimit: 1000, availableLimit: 1000 })),
    0,
  );
});

test('soma os limites dos cartões em centavos', () => {
  const summary = summarizeLimits([
    creditCard({
      id: 'first',
      creditLimit: 1000.01,
      availableLimit: 400.01,
    }),
    creditCard({
      id: 'second',
      creditLimit: 5000.02,
      availableLimit: 1000.01,
    }),
  ]);

  assert.deepEqual(summary, {
    totalLimit: 6000.03,
    committedLimit: 4600.01,
    availableLimit: 1400.02,
  });
});

test('ordena faturas cronologicamente sem alterar a lista original', () => {
  const invoices = [
    invoice({ id: 'julho', closingDate: '2026-07-31' }),
    invoice({ id: 'junho', closingDate: '2026-06-30' }),
    invoice({ id: 'agosto', closingDate: '2026-08-31' }),
  ];

  assert.deepEqual(
    sortInvoicesChronologically(invoices).map((item) => item.id),
    ['junho', 'julho', 'agosto'],
  );
  assert.deepEqual(
    invoices.map((item) => item.id),
    ['julho', 'junho', 'agosto'],
  );
});

test('identifica a fatura atual como a primeira em aberto', () => {
  const invoices = [
    invoice({ id: 'paga', status: 'PAID', closingDate: '2026-05-31' }),
    invoice({ id: 'aberta-julho', status: 'OPEN', closingDate: '2026-07-31' }),
    invoice({ id: 'aberta-junho', status: 'OPEN', closingDate: '2026-06-30' }),
  ];

  assert.equal(findCurrentInvoice(invoices)?.id, 'aberta-junho');
  assert.equal(findCurrentInvoice([]), undefined);
});

test('encontra a fatura pendente mais antiga com saldo restante', () => {
  const invoices = [
    invoice({
      id: 'parcial',
      status: 'PARTIALLY_PAID',
      closingDate: '2026-06-30',
      remainingAmount: 120.4,
    }),
    invoice({
      id: 'fechada',
      status: 'CLOSED',
      closingDate: '2026-07-31',
      remainingAmount: 400,
    }),
    invoice({
      id: 'paga',
      status: 'PAID',
      closingDate: '2026-05-31',
      remainingAmount: 0,
    }),
    invoice({
      id: 'sem-saldo',
      status: 'CLOSED',
      closingDate: '2026-04-30',
      remainingAmount: 0,
    }),
  ];

  assert.equal(findOutstandingInvoice(invoices)?.id, 'parcial');
});

test('indica atraso apenas após o vencimento e com saldo restante', () => {
  const today = new Date(2026, 10, 18, 12);

  assert.equal(
    isInvoiceOverdue(
      invoice({ dueDate: '2026-11-17', remainingAmount: 100 }),
      today,
    ),
    true,
  );
  assert.equal(
    isInvoiceOverdue(
      invoice({ dueDate: '2026-11-18', remainingAmount: 100 }),
      today,
    ),
    false,
  );
  assert.equal(
    isInvoiceOverdue(
      invoice({
        dueDate: '2026-11-10',
        remainingAmount: 100,
        status: 'PAID',
      }),
      today,
    ),
    false,
  );
  assert.equal(
    isInvoiceOverdue(
      invoice({ dueDate: '2026-11-10', remainingAmount: 0 }),
      today,
    ),
    false,
  );
});

test('formata datas de calendário sem deslocar o fuso', () => {
  assert.equal(toDateKey(new Date(2026, 6, 5, 23, 30)), '2026-07-05');
  assert.equal(formatDateKey('2026-07-05'), '05/07/2026');
  assert.equal(formatDateKey('data-invalida'), 'data-invalida');
  assert.equal(formatMonthYear('2026-07-15'), 'julho de 2026');
  assert.equal(formatMonthYear('invalida'), 'invalida');
});

test('expõe os rótulos de status usados na interface', () => {
  assert.equal(CARD_STATUS_LABELS.ACTIVE, 'Ativo');
  assert.equal(CARD_STATUS_LABELS.INACTIVE, 'Inativo');
  assert.equal(INVOICE_STATUS_LABELS.OPEN, 'Aberta');
  assert.equal(INVOICE_STATUS_LABELS.CLOSED, 'Fechada');
  assert.equal(INVOICE_STATUS_LABELS.PARTIALLY_PAID, 'Parcialmente paga');
  assert.equal(INVOICE_STATUS_LABELS.PAID, 'Paga');
  assert.equal(PURCHASE_STATUS_LABELS.ACTIVE, 'Ativa');
  assert.equal(PURCHASE_STATUS_LABELS.CANCELLED, 'Cancelada');
});

test('formata o período da fatura e a quantidade de parcelas', () => {
  assert.equal(
    formatInvoiceCycle(
      invoice({ cycleStart: '2026-06-01', cycleEnd: '2026-06-30' }),
    ),
    '01/06/2026 a 30/06/2026',
  );
  assert.equal(formatInstallmentCount(1), '1 parcela');
  assert.equal(formatInstallmentCount(6), '6 parcelas');
  assert.equal(formatInstallmentCount(0), 'Sem parcelas');
});

function purchase(
  overrides: Partial<CreditCardPurchase>,
): CreditCardPurchase {
  return {
    id: 'purchase',
    cardId: 'card',
    description: 'Compra',
    totalAmount: 0,
    currency: 'BRL',
    purchaseDate: '2026-06-05',
    categoryId: null,
    installmentCount: 1,
    status: 'ACTIVE',
    createdAt: '2026-06-05T12:00:00Z',
    installments: [],
    ...overrides,
  };
}

test('destaque da fatura reflete o status e o vencimento', () => {
  const today = new Date(2026, 10, 18, 12);

  assert.deepEqual(
    getInvoiceHighlight(
      invoice({ status: 'OPEN', remainingAmount: 100 }),
      today,
    ),
    { kind: 'current', label: 'Fatura atual' },
  );

  assert.deepEqual(
    getInvoiceHighlight(
      invoice({
        status: 'CLOSED',
        remainingAmount: 100,
        dueDate: '2026-12-10',
      }),
      today,
    ),
    { kind: 'pending', label: 'Fatura pendente' },
  );

  assert.deepEqual(
    getInvoiceHighlight(
      invoice({
        status: 'CLOSED',
        remainingAmount: 100,
        dueDate: '2026-11-10',
      }),
      today,
    ),
    { kind: 'overdue', label: 'Fatura vencida' },
  );

  assert.deepEqual(
    getInvoiceHighlight(
      invoice({
        status: 'PARTIALLY_PAID',
        remainingAmount: 50,
        dueDate: '2026-11-10',
      }),
      today,
    ),
    { kind: 'overdue', label: 'Fatura vencida' },
  );

  assert.equal(
    getInvoiceHighlight(
      invoice({ status: 'PAID', remainingAmount: 0 }),
      today,
    ),
    null,
  );

  assert.equal(
    getInvoiceHighlight(
      invoice({ status: 'CLOSED', remainingAmount: 0 }),
      today,
    ),
    null,
  );
});

test('seleciona a parcela da compra pelo invoiceId retornado pela API', () => {
  const item = purchase({
    installmentCount: 6,
    installments: [
      { id: 'one', number: 1, amount: 50, invoiceId: 'previous' },
      { id: 'two', number: 2, amount: 50, invoiceId: 'current' },
    ],
  });

  assert.equal(findPurchaseInstallment(item, 'current')?.id, 'two');
  assert.equal(findPurchaseInstallment(item, 'missing'), undefined);

  assert.equal(formatInstallmentPosition(2, 6), 'Parcela 2 de 6');
  assert.equal(formatInstallmentPosition(1, 1), 'Parcela 1 de 1');
  assert.equal(
    formatInstallmentPosition(0, 6),
    'Parcela não identificada',
  );
});

test('ordena pagamentos do mais recente para o mais antigo', () => {
  const payments = [
    {
      id: 'older',
      invoiceId: 'invoice',
      accountId: 'account',
      amount: 10,
      currency: 'BRL',
      paidAt: '2026-11-10T10:00:00Z',
    },
    {
      id: 'newer',
      invoiceId: 'invoice',
      accountId: 'account',
      amount: 20,
      currency: 'BRL',
      paidAt: '2026-11-15T10:00:00Z',
    },
  ];

  assert.deepEqual(
    sortPaymentsByPaidAtDescending(payments).map((payment) => payment.id),
    ['newer', 'older'],
  );
  assert.equal(
    sortPaymentsByPaidAtDescending([]).length,
    0,
  );
});

test('formata data e hora de pagamentos', () => {
  assert.equal(
    formatTimestamp('2026-11-18T14:32:00'),
    '18/11/2026 às 14:32',
  );
  assert.equal(formatTimestamp('invalido'), 'invalido');
});

test('considera pendentes a fatura atual e as faturas fechadas com saldo', () => {
  const invoices = [
    invoice({
      id: 'futura',
      status: 'OPEN',
      closingDate: '2026-12-31',
      dueDate: '2027-01-10',
      remainingAmount: 300,
    }),
    invoice({
      id: 'atual',
      status: 'OPEN',
      closingDate: '2026-11-30',
      dueDate: '2026-12-10',
      remainingAmount: 500,
    }),
    invoice({
      id: 'fechada',
      status: 'CLOSED',
      closingDate: '2026-10-31',
      dueDate: '2026-11-10',
      remainingAmount: 200,
    }),
    invoice({
      id: 'parcial',
      status: 'PARTIALLY_PAID',
      closingDate: '2026-09-30',
      dueDate: '2026-10-10',
      remainingAmount: 100,
    }),
    invoice({
      id: 'paga',
      status: 'PAID',
      closingDate: '2026-08-31',
      remainingAmount: 0,
    }),
    invoice({
      id: 'zerada',
      status: 'CLOSED',
      closingDate: '2026-07-31',
      remainingAmount: 0,
    }),
  ];

  assert.deepEqual(
    getPendingInvoices(invoices).map((item) => item.id),
    ['parcial', 'fechada', 'atual'],
  );
});

test('monta a lista do Dashboard apenas com cartões ativos e por urgência', () => {
  const invoicesByCard: Record<string, CreditCardInvoice[]> = {
    later: [
      invoice({
        id: 'later-invoice',
        cardId: 'later',
        status: 'CLOSED',
        dueDate: '2026-12-20',
        remainingAmount: 50,
      }),
    ],
    sooner: [
      invoice({
        id: 'sooner-invoice',
        cardId: 'sooner',
        status: 'CLOSED',
        dueDate: '2026-11-20',
        remainingAmount: 70,
      }),
    ],
    inactive: [
      invoice({
        id: 'inactive-invoice',
        cardId: 'inactive',
        status: 'CLOSED',
        dueDate: '2026-11-10',
        remainingAmount: 999,
      }),
    ],
  };

  const entries = getDashboardCardEntries(
    [
      creditCard({ id: 'later' }),
      creditCard({ id: 'inactive', status: 'INACTIVE' }),
      creditCard({ id: 'without-invoice' }),
      creditCard({ id: 'sooner' }),
    ],
    invoicesByCard,
  );

  assert.deepEqual(
    entries.map((entry) => entry.card.id),
    ['sooner', 'later', 'without-invoice'],
  );
  assert.equal(entries[0].pendingInvoices[0].id, 'sooner-invoice');
  assert.deepEqual(entries[2].pendingInvoices, []);
});

test('soma as faturas pendentes dos cartões ativos em centavos', () => {
  const entries = getDashboardCardEntries(
    [creditCard({ id: 'first' }), creditCard({ id: 'second' })],
    {
      first: [
        invoice({
          id: 'first-current',
          cardId: 'first',
          status: 'OPEN',
          remainingAmount: 0.1,
        }),
        invoice({
          id: 'first-future',
          cardId: 'first',
          status: 'OPEN',
          closingDate: '2026-12-31',
          remainingAmount: 5000,
        }),
      ],
      second: [
        invoice({
          id: 'second-closed',
          cardId: 'second',
          status: 'CLOSED',
          remainingAmount: 0.2,
        }),
        invoice({
          id: 'second-paid',
          cardId: 'second',
          status: 'PAID',
          remainingAmount: 0,
        }),
      ],
    },
  );

  assert.deepEqual(summarizePendingInvoices(entries), {
    total: 0.3,
    count: 2,
  });
});

test('lista faturas com saldo apenas de cartões ativos, por vencimento', () => {
  const entries = getOutstandingInvoiceEntries(
    [
      creditCard({ id: 'active' }),
      creditCard({ id: 'inactive', status: 'INACTIVE' }),
    ],
    {
      active: [
        invoice({
          id: 'later',
          cardId: 'active',
          status: 'OPEN',
          dueDate: '2027-01-10',
          remainingAmount: 120,
        }),
        invoice({
          id: 'sooner',
          cardId: 'active',
          status: 'CLOSED',
          dueDate: '2026-12-10',
          remainingAmount: 80,
        }),
        invoice({
          id: 'paid',
          cardId: 'active',
          status: 'PAID',
          dueDate: '2026-11-10',
          remainingAmount: 500,
        }),
        invoice({
          id: 'zero',
          cardId: 'active',
          status: 'OPEN',
          dueDate: '2026-11-20',
          remainingAmount: 0,
        }),
      ],
      inactive: [
        invoice({
          id: 'inactive-invoice',
          cardId: 'inactive',
          status: 'CLOSED',
          dueDate: '2026-11-01',
          remainingAmount: 999,
        }),
      ],
    },
  );

  assert.deepEqual(
    entries.map((entry) => entry.invoice.id),
    ['sooner', 'later'],
  );
});

test('resume total, quantidade e próximo vencimento das faturas', () => {
  const entries = getOutstandingInvoiceEntries(
    [creditCard({ id: 'active' })],
    {
      active: [
        invoice({
          id: 'first',
          cardId: 'active',
          status: 'CLOSED',
          dueDate: '2026-11-10',
          remainingAmount: 0.1,
        }),
        invoice({
          id: 'second',
          cardId: 'active',
          status: 'OPEN',
          dueDate: '2026-12-10',
          remainingAmount: 0.2,
        }),
      ],
    },
  );

  assert.deepEqual(summarizeInvoiceEntries(entries, new Date(2026, 10, 19)), {
    total: 0.3,
    count: 2,
    nextDueDate: '2026-11-10',
    nextDueOverdue: true,
  });
});

test('limita a lista compacta de faturas a quatro itens', () => {
  const entries = getOutstandingInvoiceEntries(
    [creditCard({ id: 'active' })],
    {
      active: Array.from({ length: 6 }, (_, index) =>
        invoice({
          id: `invoice-${index}`,
          cardId: 'active',
          status: 'CLOSED',
          dueDate: `2026-12-${String(index + 1).padStart(2, '0')}`,
          remainingAmount: 10,
        }),
      ),
    },
  );

  const { visible, hiddenCount } = getVisibleInvoiceEntries(entries);

  assert.equal(visible.length, 4);
  assert.equal(hiddenCount, 2);
});

test('agrupa a evolução das faturas por mês de vencimento', () => {
  const entries = getOutstandingInvoiceEntries(
    [creditCard({ id: 'active' })],
    {
      active: [
        invoice({
          id: 'november',
          cardId: 'active',
          status: 'CLOSED',
          dueDate: '2026-11-10',
          remainingAmount: 100,
        }),
        invoice({
          id: 'november-late',
          cardId: 'active',
          status: 'OPEN',
          dueDate: '2026-11-25',
          remainingAmount: 50.5,
        }),
        invoice({
          id: 'january',
          cardId: 'active',
          status: 'OPEN',
          dueDate: '2027-01-10',
          remainingAmount: 200,
        }),
      ],
    },
  );

  const evolution = buildInvoiceEvolution(
    entries,
    new Date(2026, 10, 19),
    4,
  );

  assert.deepEqual(
    evolution.map((point) => point.key),
    ['2026-11', '2026-12', '2027-01', '2027-02'],
  );
  assert.deepEqual(
    evolution.map((point) => point.total),
    [150.5, 0, 200, 0],
  );
  assert.equal(
    formatEvolutionPeriod(evolution),
    'novembro de 2026 a fevereiro de 2027',
  );
});

test('descarta meses fora da janela da evolução', () => {
  const entries = getOutstandingInvoiceEntries(
    [creditCard({ id: 'active' })],
    {
      active: [
        invoice({
          id: 'overdue',
          cardId: 'active',
          status: 'CLOSED',
          dueDate: '2026-10-10',
          remainingAmount: 999,
        }),
        invoice({
          id: 'in-window',
          cardId: 'active',
          status: 'OPEN',
          dueDate: '2026-11-10',
          remainingAmount: 100,
        }),
      ],
    },
  );

  const evolution = buildInvoiceEvolution(
    entries,
    new Date(2026, 10, 19),
    2,
  );

  assert.deepEqual(
    evolution.map((point) => point.total),
    [100, 0],
  );
});

test('mantém a janela completa quando a consulta de faturas é confiável', () => {
  const evolution = [
    { key: '2026-11', total: 0 },
    { key: '2026-12', total: 0 },
    { key: '2027-01', total: 0 },
  ];

  assert.deepEqual(trimEvolutionToData(evolution), []);
});

test('corta meses sem dados quando a consulta de faturas falhou', () => {
  const evolution = [
    { key: '2026-11', total: 0 },
    { key: '2026-12', total: 250 },
    { key: '2027-01', total: 0 },
    { key: '2027-02', total: 0 },
  ];

  assert.deepEqual(trimEvolutionToData(evolution), [
    { key: '2026-12', total: 250 },
  ]);
});

