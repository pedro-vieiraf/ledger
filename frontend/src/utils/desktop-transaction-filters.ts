export type PeriodFilter =
  | 'all'
  | 'current-month'
  | 'last-3-months'
  | 'last-6-months'
  | 'current-year'
  | 'custom';

export type TransactionTypeFilter =
  | 'all'
  | 'income'
  | 'expense'
  | 'transfer';

export type DesktopTransactionFilters = {
  query: string;
  period: PeriodFilter;
  accountId: string;
  categoryId: string;
  type: TransactionTypeFilter;
  customStart: string;
  customEnd: string;
};

export type FilterableTransaction = {
  description: string;
  categoryId: string | null;
  accountId: string;
  destinationAccountId: string | null;
  timestamp: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
};

export const TRANSACTIONS_PAGE_SIZE = 12;

export const PERIOD_OPTIONS: { label: string; value: PeriodFilter }[] = [
  { label: 'Todo o período', value: 'all' },
  { label: 'Mês atual', value: 'current-month' },
  { label: 'Últimos 3 meses', value: 'last-3-months' },
  { label: 'Últimos 6 meses', value: 'last-6-months' },
  { label: 'Ano atual', value: 'current-year' },
  { label: 'Personalizado', value: 'custom' },
];

export const TYPE_OPTIONS: {
  label: string;
  value: TransactionTypeFilter;
}[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Receitas', value: 'income' },
  { label: 'Despesas', value: 'expense' },
  { label: 'Transferências', value: 'transfer' },
];

const API_TYPE_BY_FILTER: Record<
  Exclude<TransactionTypeFilter, 'all'>,
  FilterableTransaction['type']
> = {
  income: 'INCOME',
  expense: 'EXPENSE',
  transfer: 'TRANSFER',
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR');
}

function parseFilterDate(value: string) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day, 0, 0, 0, 0);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export type PeriodBounds = {
  start: Date | null;
  endExclusive: Date | null;
};

/**
 * Calcula os limites do período selecionado. O fim é exclusivo para evitar
 * problemas de horário no último dia do intervalo.
 */
export function getPeriodBounds(
  period: PeriodFilter,
  referenceDate: Date = new Date(),
  customStart = '',
  customEnd = '',
): PeriodBounds {
  const monthStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1,
  );
  const nextMonthStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    1,
  );

  switch (period) {
    case 'current-month':
      return { start: monthStart, endExclusive: nextMonthStart };
    case 'last-3-months':
      return {
        start: new Date(
          referenceDate.getFullYear(),
          referenceDate.getMonth() - 2,
          1,
        ),
        endExclusive: nextMonthStart,
      };
    case 'last-6-months':
      return {
        start: new Date(
          referenceDate.getFullYear(),
          referenceDate.getMonth() - 5,
          1,
        ),
        endExclusive: nextMonthStart,
      };
    case 'current-year':
      return {
        start: new Date(referenceDate.getFullYear(), 0, 1),
        endExclusive: new Date(referenceDate.getFullYear() + 1, 0, 1),
      };
    case 'custom': {
      const start = parseFilterDate(customStart);
      const end = parseFilterDate(customEnd);

      return {
        start,
        endExclusive: end
          ? new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1)
          : null,
      };
    }
    case 'all':
    default:
      return { start: null, endExclusive: null };
  }
}

export function filterDesktopTransactions<T extends FilterableTransaction>(
  transactions: T[],
  filters: DesktopTransactionFilters,
  referenceDate: Date = new Date(),
): T[] {
  const query = normalize(filters.query);
  const bounds = getPeriodBounds(
    filters.period,
    referenceDate,
    filters.customStart,
    filters.customEnd,
  );

  return transactions.filter((transaction) => {
    if (
      filters.type !== 'all' &&
      transaction.type !== API_TYPE_BY_FILTER[filters.type]
    ) {
      return false;
    }

    if (
      filters.accountId !== 'all' &&
      transaction.accountId !== filters.accountId &&
      transaction.destinationAccountId !== filters.accountId
    ) {
      return false;
    }

    if (filters.categoryId !== 'all') {
      // Transferências não possuem categoria própria; elas aparecem apenas
      // quando o filtro de categoria está desativado.
      if (transaction.type === 'TRANSFER') {
        return false;
      }

      if (
        filters.categoryId === 'uncategorized'
          ? transaction.categoryId !== null
          : transaction.categoryId !== filters.categoryId
      ) {
        return false;
      }
    }

    if (query && !normalize(transaction.description).includes(query)) {
      return false;
    }

    if (bounds.start || bounds.endExclusive) {
      const timestamp = new Date(transaction.timestamp).getTime();

      if (Number.isNaN(timestamp)) {
        return false;
      }

      if (bounds.start && timestamp < bounds.start.getTime()) {
        return false;
      }

      if (bounds.endExclusive && timestamp >= bounds.endExclusive.getTime()) {
        return false;
      }
    }

    return true;
  });
}

export type TransactionPage<T> = {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
};

export function paginateTransactions<T>(
  transactions: T[],
  page: number,
  pageSize: number = TRANSACTIONS_PAGE_SIZE,
): TransactionPage<T> {
  const total = transactions.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const start = (safePage - 1) * pageSize;
  const items = transactions.slice(start, start + pageSize);

  return {
    items,
    page: safePage,
    pageCount,
    total,
    rangeStart: total === 0 ? 0 : start + 1,
    rangeEnd: start + items.length,
  };
}
