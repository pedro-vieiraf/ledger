import type {
  CreditCard,
  CreditCardStatus,
} from '@/services/credit-cards-api';
import type {
  CreditCardInvoice,
  CreditCardInvoiceStatus,
  CreditCardPayment,
} from '@/services/credit-card-invoices-api';
import type {
  CreditCardInstallment,
  CreditCardPurchase,
  CreditCardPurchaseStatus,
} from '@/services/credit-card-purchases-api';

/**
 * Regras de apresentação dos cartões de crédito.
 *
 * Nenhum cálculo financeiro é feito aqui: o limite disponível vem do backend e
 * o limite comprometido é apenas a diferença entre o limite total e o
 * disponível, ambos informados pela API. As operações usam centavos inteiros
 * para evitar imprecisão de ponto flutuante.
 */

export const CARD_STATUS_LABELS: Record<CreditCardStatus, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
};

export const INVOICE_STATUS_LABELS: Record<
  CreditCardInvoiceStatus,
  string
> = {
  OPEN: 'Aberta',
  CLOSED: 'Fechada',
  PARTIALLY_PAID: 'Parcialmente paga',
  PAID: 'Paga',
};

export const PURCHASE_STATUS_LABELS: Record<
  CreditCardPurchaseStatus,
  string
> = {
  ACTIVE: 'Ativa',
  CANCELLED: 'Cancelada',
};

const monthYearFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});

const timestampFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Converte um valor monetário em centavos inteiros. */
export function toCents(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 100);
}

/** Converte centavos inteiros em valor monetário. */
export function fromCents(cents: number): number {
  if (!Number.isFinite(cents)) {
    return 0;
  }

  return Math.round(cents) / 100;
}

/**
 * Limite comprometido do cartão.
 *
 * Corresponde a `creditLimit - availableLimit`, com ambos os valores enviados
 * pelo backend. Inclui parcelas futuras, porque o disponível já as desconta.
 */
export function getCommittedLimit(card: CreditCard): number {
  const committed =
    toCents(card.creditLimit) - toCents(card.availableLimit);

  return fromCents(Math.max(0, committed));
}

/** Proporção do limite já comprometida, entre 0 e 1. */
export function getUsageRatio(card: CreditCard): number {
  const total = toCents(card.creditLimit);

  if (total <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, toCents(getCommittedLimit(card)) / total));
}

/**
 * Somatório informativo dos limites dos cartões.
 *
 * Limites de cartões diferentes não são fungíveis; os valores servem apenas
 * como indicadores consolidados da carteira.
 */
export function summarizeLimits(cards: CreditCard[]) {
  let totalCents = 0;
  let committedCents = 0;
  let availableCents = 0;

  for (const card of cards) {
    totalCents += toCents(card.creditLimit);
    availableCents += toCents(card.availableLimit);
    committedCents += toCents(getCommittedLimit(card));
  }

  return {
    totalLimit: fromCents(totalCents),
    committedLimit: fromCents(committedCents),
    availableLimit: fromCents(availableCents),
  };
}

/** Ordena faturas da mais antiga para a mais recente. */
export function sortInvoicesChronologically(
  invoices: CreditCardInvoice[],
): CreditCardInvoice[] {
  return [...invoices].sort((first, second) => {
    if (first.closingDate !== second.closingDate) {
      return first.closingDate < second.closingDate ? -1 : 1;
    }

    return first.cycleStart < second.cycleStart ? -1 : 1;
  });
}

/**
 * Fatura atual: a primeira fatura em aberto no ciclo cronológico.
 *
 * Faturas futuras só existem quando o backend as criou por causa de parcelas.
 */
export function findCurrentInvoice(
  invoices: CreditCardInvoice[],
): CreditCardInvoice | undefined {
  return sortInvoicesChronologically(invoices).find(
    (invoice) => invoice.status === 'OPEN',
  );
}

/**
 * Próxima fatura com valor pendente: a mais antiga que ainda tem saldo.
 */
export function findOutstandingInvoice(
  invoices: CreditCardInvoice[],
): CreditCardInvoice | undefined {
  return sortInvoicesChronologically(invoices).find(
    (invoice) =>
      invoice.status !== 'PAID' && toCents(invoice.remainingAmount) > 0,
  );
}

/**
 * Faturas que aguardam pagamento.
 *
 * Considera as faturas fechadas ou parcialmente pagas com saldo e a fatura
 * atual (a primeira em aberto). Faturas futuras, criadas para as parcelas de
 * uma compra, continuam em `OPEN` mas ainda não são dívidas exigíveis deste
 * ciclo e por isso não entram no total. Nenhum valor é recalculado aqui: usa-se
 * apenas o `remainingAmount` informado pelo backend.
 */
export function getPendingInvoices(
  invoices: CreditCardInvoice[],
): CreditCardInvoice[] {
  const current = findCurrentInvoice(invoices);

  return sortInvoicesChronologically(invoices).filter((invoice) => {
    if (invoice.status === 'PAID' || toCents(invoice.remainingAmount) <= 0) {
      return false;
    }

    if (invoice.status === 'OPEN') {
      return invoice.id === current?.id;
    }

    return true;
  });
}

export interface DashboardCardEntry {
  card: CreditCard;
  /** Faturas pendentes do cartão, da mais urgente para a menos urgente. */
  pendingInvoices: CreditCardInvoice[];
}

/**
 * Cartões ativos com suas faturas pendentes.
 *
 * A ordenação prioriza o vencimento mais próximo; cartões sem fatura pendente
 * ficam ao final, mas continuam na lista para exibir o limite disponível.
 */
export function getDashboardCardEntries(
  cards: CreditCard[],
  invoicesByCard: Record<string, CreditCardInvoice[]>,
): DashboardCardEntry[] {
  const entries = cards
    .filter((card) => card.status === 'ACTIVE')
    .map((card) => ({
      card,
      pendingInvoices: getPendingInvoices(invoicesByCard[card.id] ?? []),
    }));

  return entries.sort((first, second) => {
    const firstDue = first.pendingInvoices[0]?.dueDate;
    const secondDue = second.pendingInvoices[0]?.dueDate;

    if (firstDue && secondDue && firstDue !== secondDue) {
      return firstDue < secondDue ? -1 : 1;
    }

    if (firstDue) {
      return -1;
    }

    if (secondDue) {
      return 1;
    }

    return 0;
  });
}

/**
 * Total restante das faturas pendentes e quantidade de faturas somadas.
 *
 * A soma é feita em centavos inteiros para evitar imprecisão de ponto
 * flutuante ao consolidar vários valores do backend.
 */
export function summarizePendingInvoices(entries: DashboardCardEntry[]) {
  let totalCents = 0;
  let count = 0;

  for (const entry of entries) {
    for (const invoice of entry.pendingInvoices) {
      totalCents += toCents(invoice.remainingAmount);
      count += 1;
    }
  }

  return { total: fromCents(totalCents), count };
}

export type InvoiceHighlightKind = 'current' | 'pending' | 'overdue';

export interface InvoiceHighlight {
  kind: InvoiceHighlightKind;
  label: string;
}

/**
 * Rótulo do destaque visual de uma fatura.
 *
 * Somente uma fatura em aberto é a "atual". Uma fatura fechada com saldo é
 * "pendente" e, se o vencimento já passou, "vencida" — ela nunca deve ser
 * chamada de "próxima" apenas por não existir uma fatura em aberto. O atraso
 * continua sendo um indicador derivado e não altera o status da API.
 */
export function getInvoiceHighlight(
  invoice: CreditCardInvoice,
  today: Date = new Date(),
): InvoiceHighlight | null {
  if (invoice.status === 'PAID' || toCents(invoice.remainingAmount) <= 0) {
    return null;
  }

  if (invoice.status === 'OPEN') {
    return { kind: 'current', label: 'Fatura atual' };
  }

  if (isInvoiceOverdue(invoice, today)) {
    return { kind: 'overdue', label: 'Fatura vencida' };
  }

  return { kind: 'pending', label: 'Fatura pendente' };
}


/** Data no formato `AAAA-MM-DD` usando o fuso local. */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Indica atraso a partir do vencimento e do saldo restante.
 *
 * É um indicador visual derivado; o status da fatura continua sendo o do
 * backend, que não possui o estado "vencida".
 */
export function isInvoiceOverdue(
  invoice: CreditCardInvoice,
  today: Date = new Date(),
): boolean {
  if (invoice.status === 'PAID' || toCents(invoice.remainingAmount) <= 0) {
    return false;
  }

  return invoice.dueDate < toDateKey(today);
}

function parseDateParts(value: string) {
  const [year, month, day] = value.split('-').map(Number);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }

  return { year, month, day };
}

/** Formata uma data `AAAA-MM-DD` como `DD/MM/AAAA`. */
export function formatDateKey(value: string): string {
  const parts = parseDateParts(value);

  if (!parts) {
    return value;
  }

  return [
    String(parts.day).padStart(2, '0'),
    String(parts.month).padStart(2, '0'),
    parts.year,
  ].join('/');
}

/** Formata uma data `AAAA-MM-DD` como `mês de ano`, por exemplo julho de 2026. */
export function formatMonthYear(value: string): string {
  const parts = parseDateParts(value);

  if (!parts) {
    return value;
  }

  const date = new Date(parts.year, parts.month - 1, parts.day, 12);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return monthYearFormatter.format(date);
}

/** Período/ciclo da fatura, por exemplo `01/06/2026 a 30/06/2026`. */
export function formatInvoiceCycle(invoice: CreditCardInvoice): string {
  return `${formatDateKey(invoice.cycleStart)} a ${formatDateKey(invoice.cycleEnd)}`;
}

/** Rótulo da quantidade de parcelas de uma compra. */
export function formatInstallmentCount(count: number): string {
  if (!Number.isFinite(count) || count <= 0) {
    return 'Sem parcelas';
  }

  return count === 1 ? '1 parcela' : `${count} parcelas`;
}

/**
 * Parcela de uma compra que pertence à fatura informada.
 *
 * A distribuição das parcelas é definida pelo backend; aqui apenas
 * selecionamos a parcela cujo `invoiceId` corresponde à fatura aberta.
 */
export function findPurchaseInstallment(
  purchase: CreditCardPurchase,
  invoiceId: string,
): CreditCardInstallment | undefined {
  return purchase.installments.find(
    (installment) => installment.invoiceId === invoiceId,
  );
}

/** Posição da parcela, por exemplo `Parcela 2 de 6`. */
export function formatInstallmentPosition(
  number: number,
  total: number,
): string {
  if (
    !Number.isFinite(number) ||
    number <= 0 ||
    !Number.isFinite(total) ||
    total <= 0
  ) {
    return 'Parcela não identificada';
  }

  return `Parcela ${number} de ${total}`;
}

/** Ordena pagamentos do mais recente para o mais antigo. */
export function sortPaymentsByPaidAtDescending(
  payments: CreditCardPayment[],
): CreditCardPayment[] {
  return [...payments].sort((first, second) => {
    const firstTime = new Date(first.paidAt).getTime();
    const secondTime = new Date(second.paidAt).getTime();

    if (Number.isNaN(firstTime) || Number.isNaN(secondTime)) {
      return 0;
    }

    return secondTime - firstTime;
  });
}

/** Formata um instante ISO como `DD/MM/AAAA às HH:MM`. */
export function formatTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return timestampFormatter.format(date).replace(', ', ' às ');
}

/** Fatura com saldo restante de um cartão ativo. */
export interface OutstandingInvoiceEntry {
  card: CreditCard;
  invoice: CreditCardInvoice;
}

export interface InvoiceEntriesSummary {
  /** Soma de `remainingAmount` de todas as faturas consideradas. */
  total: number;
  count: number;
  nextDueDate: string | null;
  nextDueOverdue: boolean;
}

export interface InvoiceEvolutionPoint {
  /** Mês de vencimento no formato `AAAA-MM`. */
  key: string;
  /** Soma de `remainingAmount` das faturas com vencimento no mês. */
  total: number;
}

export const INVOICE_EVOLUTION_MONTHS = 6;

const INVOICE_LIST_LIMIT = 4;

/**
 * Faturas pendentes de cartões ativos, ordenadas pelo vencimento.
 *
 * Considera toda fatura não paga com saldo restante, inclusive faturas
 * futuras já criadas pelo backend para as parcelas de uma compra. O saldo é
 * sempre o `remainingAmount` informado pela API; nenhum valor é recalculado.
 */
export function getOutstandingInvoiceEntries(
  cards: CreditCard[],
  invoicesByCard: Record<string, CreditCardInvoice[]>,
): OutstandingInvoiceEntry[] {
  const entries: OutstandingInvoiceEntry[] = [];

  for (const card of cards) {
    if (card.status !== 'ACTIVE') {
      continue;
    }

    for (const invoice of invoicesByCard[card.id] ?? []) {
      if (invoice.status === 'PAID' || toCents(invoice.remainingAmount) <= 0) {
        continue;
      }

      entries.push({ card, invoice });
    }
  }

  return entries.sort((first, second) => {
    if (first.invoice.dueDate === second.invoice.dueDate) {
      return 0;
    }

    return first.invoice.dueDate < second.invoice.dueDate ? -1 : 1;
  });
}

/** Total restante, quantidade e próximo vencimento das faturas informadas. */
export function summarizeInvoiceEntries(
  entries: OutstandingInvoiceEntry[],
  today: Date = new Date(),
): InvoiceEntriesSummary {
  let totalCents = 0;

  for (const entry of entries) {
    totalCents += toCents(entry.invoice.remainingAmount);
  }

  const next = entries[0];

  return {
    total: fromCents(totalCents),
    count: entries.length,
    nextDueDate: next?.invoice.dueDate ?? null,
    nextDueOverdue: next ? isInvoiceOverdue(next.invoice, today) : false,
  };
}

/** Quantidade máxima de faturas exibidas em uma lista compacta. */
export function getVisibleInvoiceEntries(
  entries: OutstandingInvoiceEntry[],
): {
  visible: OutstandingInvoiceEntry[];
  hiddenCount: number;
} {
  return {
    visible: entries.slice(0, INVOICE_LIST_LIMIT),
    hiddenCount: Math.max(entries.length - INVOICE_LIST_LIMIT, 0),
  };
}

function evolutionMonthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

/**
 * Evolução das faturas por mês de vencimento.
 *
 * A janela começa no mês atual e cobre `months` meses. Somente as faturas
 * informadas entram na soma; meses sem faturas ficam zerados, o que só é
 * exibido quando a consulta de faturas terminou com sucesso.
 */
export function buildInvoiceEvolution(
  entries: OutstandingInvoiceEntry[],
  today: Date = new Date(),
  months: number = INVOICE_EVOLUTION_MONTHS,
): InvoiceEvolutionPoint[] {
  const safeMonths =
    Number.isFinite(months) && months > 0
      ? Math.floor(months)
      : INVOICE_EVOLUTION_MONTHS;

  const keys: string[] = [];

  for (let index = 0; index < safeMonths; index += 1) {
    const date = new Date(today.getFullYear(), today.getMonth() + index, 1, 12);
    keys.push(evolutionMonthKey(date.getFullYear(), date.getMonth()));
  }

  const totalsByMonth = new Map<string, number>();

  for (const entry of entries) {
    const key = entry.invoice.dueDate.slice(0, 7);

    if (!keys.includes(key)) {
      continue;
    }

    totalsByMonth.set(
      key,
      (totalsByMonth.get(key) ?? 0) + toCents(entry.invoice.remainingAmount),
    );
  }

  return keys.map((key) => ({
    key,
    total: fromCents(totalsByMonth.get(key) ?? 0),
  }));
}

/**
 * Reduz a evolução ao período efetivamente coberto por dados.
 *
 * Usado quando a consulta de faturas falhou: nesse caso não é possível
 * confirmar a ausência de faturas nos meses zerados, então apenas o intervalo
 * entre o primeiro e o último mês com valor é apresentado.
 */
export function trimEvolutionToData(
  points: InvoiceEvolutionPoint[],
): InvoiceEvolutionPoint[] {
  const firstIndex = points.findIndex((point) => toCents(point.total) > 0);

  if (firstIndex === -1) {
    return [];
  }

  const lastIndex = points.reduce(
    (last, point, index) => (toCents(point.total) > 0 ? index : last),
    firstIndex,
  );

  return points.slice(firstIndex, lastIndex + 1);
}

/** Período coberto pela evolução, por exemplo `novembro de 2026 a abril de 2027`. */
export function formatEvolutionPeriod(points: InvoiceEvolutionPoint[]): string {
  if (points.length === 0) {
    return '';
  }

  const first = formatMonthYear(`${points[0].key}-01`);

  if (points.length === 1) {
    return first;
  }

  const last = formatMonthYear(`${points[points.length - 1].key}-01`);

  return `${first} a ${last}`;
}
