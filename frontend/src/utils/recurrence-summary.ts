import type {
  RecurrenceFrequency,
  RecurrenceStatus,
  RecurrenceType,
} from '@/services/recurrences-api';

export type RecurrenceStatusFilter = 'all' | RecurrenceStatus;

export type SummarizableRecurrence = {
  amount: number;
  currency: string;
  type: RecurrenceType;
  description: string | null;
  accountId: string;
  categoryId: string | null;
  frequency: RecurrenceFrequency;
  nextOccurrence: string;
  status: RecurrenceStatus;
};

export type RecurrenceFilters = {
  query: string;
  status: RecurrenceStatusFilter;
  accountNameById: ReadonlyMap<string, string>;
};

export type RecurrenceSummary = {
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  monthlyExpenseTotal: number;
  monthlyExpenseCount: number;
  upcomingCount: number;
  upcomingWindowDays: number;
};

export const UPCOMING_WINDOW_DAYS = 30;

function parseIsoLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

function addDays(date: Date, days: number) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    12,
  );
}

function compareRecurrences(
  first: SummarizableRecurrence,
  second: SummarizableRecurrence,
) {
  if (first.status !== second.status) {
    return first.status === 'ACTIVE' ? -1 : 1;
  }

  const byNextOccurrence = first.nextOccurrence.localeCompare(
    second.nextOccurrence,
  );

  if (byNextOccurrence !== 0) {
    return byNextOccurrence;
  }

  return (first.description ?? '').localeCompare(
    second.description ?? '',
    'pt-BR',
  );
}

export function filterRecurrences<T extends SummarizableRecurrence>(
  recurrences: T[],
  { query, status, accountNameById }: RecurrenceFilters,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');

  return recurrences
    .filter((recurrence) => {
      if (status !== 'all' && recurrence.status !== status) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const accountName = accountNameById.get(recurrence.accountId) ?? '';
      const searchable = `${recurrence.description ?? ''} ${accountName}`;

      return searchable
        .toLocaleLowerCase('pt-BR')
        .includes(normalizedQuery);
    })
    .sort(compareRecurrences);
}

export function summarizeRecurrences(
  recurrences: SummarizableRecurrence[],
  today = new Date(),
): RecurrenceSummary {
  const active = recurrences.filter(
    (recurrence) => recurrence.status === 'ACTIVE',
  );

  // Apenas despesas mensais em BRL entram no valor recorrente mensal. Outras
  // frequências exigiriam estimativas e moedas diferentes não são somáveis.
  const monthlyExpenses = active.filter(
    (recurrence) =>
      recurrence.frequency === 'MONTHLY' &&
      recurrence.type === 'EXPENSE' &&
      recurrence.currency === 'BRL',
  );

  const monthlyCents = monthlyExpenses.reduce(
    (total, recurrence) => total + Math.round(recurrence.amount * 100),
    0,
  );

  const windowStart = startOfLocalDay(today);
  const windowEnd = addDays(windowStart, UPCOMING_WINDOW_DAYS);

  const upcomingCount = active.filter((recurrence) => {
    const nextOccurrence = parseIsoLocalDate(recurrence.nextOccurrence);

    return (
      nextOccurrence !== null &&
      nextOccurrence >= windowStart &&
      nextOccurrence <= windowEnd
    );
  }).length;

  return {
    totalCount: recurrences.length,
    activeCount: active.length,
    inactiveCount: recurrences.length - active.length,
    monthlyExpenseTotal: monthlyCents / 100,
    monthlyExpenseCount: monthlyExpenses.length,
    upcomingCount,
    upcomingWindowDays: UPCOMING_WINDOW_DAYS,
  };
}
