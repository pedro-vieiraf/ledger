import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  formatMonthLabel,
  formatMonthShort,
  formatTransactionDate,
  getDefaultTransactionDescription,
} from '@/components/desktop/desktop-format';
import { useAccounts } from '@/contexts/accounts-context';
import { useTransactions } from '@/contexts/transactions-context';
import { getCategories, type Category } from '@/services/categories-api';
import type { TransactionType } from '@/services/transactions-api';
import {
  filterTransactionsByMonth,
  getActiveAccounts,
  summarizeTransactions,
  sumAccountBalances,
  toCents,
  type FinancialSummary,
} from '@/utils/financial-summary';
import { sortTransactionsByTimestampDescending } from '@/utils/transaction-sort';

const CATEGORY_COLORS = [
  '#1F5B45',
  '#5474A1',
  '#B5473C',
  '#A36A1F',
  '#6F7D71',
  '#8A6A98',
];

const MAX_CATEGORY_ROWS = 5;

export type ChartRange = '3m' | '6m' | '12m';

const CHART_RANGE_MONTHS: Record<ChartRange, number> = {
  '3m': 3,
  '6m': 6,
  '12m': 12,
};

export type MonthlySeriesPoint = {
  key: string;
  date: Date;
  label: string;
  income: number;
  expense: number;
};

export type CategoryExpensePoint = {
  id: string;
  name: string;
  amount: number;
  percent: number;
  color: string;
};

export type DashboardTransaction = {
  id: string;
  description: string;
  category: string;
  account: string;
  dateLabel: string;
  amount: number;
  currency: string;
  type: TransactionType;
  isRecurring: boolean;
};

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function useDesktopDashboard() {
  const {
    accounts,
    loading: accountsLoading,
    error: accountsError,
    refreshAccounts,
  } = useAccounts();
  const {
    transactions,
    loading: transactionsLoading,
    error: transactionsError,
    refreshTransactions,
  } = useTransactions();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [chartRange, setChartRange] = useState<ChartRange>('6m');

  const refreshInFlightRef = useRef(false);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);

    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      setCategoriesError(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as categorias.',
      );
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;
    setRefreshing(true);

    await Promise.allSettled([
      refreshAccounts(),
      refreshTransactions(),
      loadCategories(),
    ]);

    refreshInFlightRef.current = false;
    setRefreshing(false);
    setHasLoadedOnce(true);
  }, [loadCategories, refreshAccounts, refreshTransactions]);

  useFocusEffect(
    useCallback(() => {
      void refreshDashboard();
    }, [refreshDashboard]),
  );

  const selectedMonth = useMemo(() => {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const monthLabel = useMemo(() => formatMonthLabel(selectedMonth), [selectedMonth]);

  const activeAccounts = useMemo(
    () => getActiveAccounts(accounts),
    [accounts],
  );

  const totalBalance = useMemo(
    () => sumAccountBalances(activeAccounts),
    [activeAccounts],
  );

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const accountsById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );

  const monthlyTransactions = useMemo(
    () => filterTransactionsByMonth(transactions, selectedMonth),
    [selectedMonth, transactions],
  );

  const summary = useMemo<FinancialSummary>(
    () => summarizeTransactions(monthlyTransactions),
    [monthlyTransactions],
  );

  const monthlySeries = useMemo<MonthlySeriesPoint[]>(() => {
    const monthCount = CHART_RANGE_MONTHS[chartRange];

    const months = Array.from({ length: monthCount }, (_, index) => {
      const date = new Date(
        selectedMonth.getFullYear(),
        selectedMonth.getMonth() - (monthCount - 1 - index),
        1,
      );

      return {
        key: getMonthKey(date),
        date,
        label: formatMonthShort(date),
        incomeCents: 0,
        expenseCents: 0,
      };
    });

    const monthsByKey = new Map(months.map((month) => [month.key, month]));

    for (const transaction of transactions) {
      if (transaction.currency !== 'BRL') {
        continue;
      }

      const date = new Date(transaction.timestamp);

      if (Number.isNaN(date.getTime())) {
        continue;
      }

      const month = monthsByKey.get(getMonthKey(date));

      if (!month) {
        continue;
      }

      const cents = toCents(transaction.amount);

      if (transaction.type === 'INCOME') {
        month.incomeCents += cents;
      } else if (transaction.type === 'EXPENSE') {
        month.expenseCents += cents;
      }
    }

    return months.map((month) => ({
      key: month.key,
      date: month.date,
      label: month.label,
      income: month.incomeCents / 100,
      expense: month.expenseCents / 100,
    }));
  }, [chartRange, selectedMonth, transactions]);

  const categoryBreakdown = useMemo<CategoryExpensePoint[]>(() => {
    const totals = new Map<string, number>();

    for (const transaction of monthlyTransactions) {
      if (
        transaction.type !== 'EXPENSE' ||
        transaction.currency !== 'BRL'
      ) {
        continue;
      }

      const key = transaction.categoryId ?? 'uncategorized';
      totals.set(key, (totals.get(key) ?? 0) + toCents(transaction.amount));
    }

    const entries = [...totals.entries()]
      .map(([id, amountCents]) => ({
        id,
        name:
          id === 'uncategorized'
            ? 'Sem categoria'
            : categoriesById.get(id) ?? 'Categoria removida',
        amountCents,
      }))
      .filter((entry) => entry.amountCents > 0)
      .sort((first, second) => second.amountCents - first.amountCents);

    const totalCents = entries.reduce(
      (total, entry) => total + entry.amountCents,
      0,
    );

    if (totalCents === 0) {
      return [];
    }

    const topEntries = entries.slice(0, MAX_CATEGORY_ROWS);
    const remainingEntries = entries.slice(MAX_CATEGORY_ROWS);
    const remainingCents = remainingEntries.reduce(
      (total, entry) => total + entry.amountCents,
      0,
    );

    const groupedEntries =
      remainingCents > 0
        ? [
            ...topEntries,
            {
              id: 'other',
              name: 'Outras',
              amountCents: remainingCents,
            },
          ]
        : topEntries;

    return groupedEntries.map((entry, index) => ({
      id: entry.id,
      name: entry.name,
      amount: entry.amountCents / 100,
      percent: entry.amountCents / totalCents,
      color:
        entry.id === 'other'
          ? '#9AA39C'
          : CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));
  }, [categoriesById, monthlyTransactions]);

  const recentTransactions = useMemo<DashboardTransaction[]>(
    () =>
      sortTransactionsByTimestampDescending(transactions)
        .slice(0, 5)
        .map((transaction) => {
          const category =
            transaction.type === 'TRANSFER'
              ? 'Transferência'
              : categoriesById.get(transaction.categoryId ?? '') ??
                'Sem categoria';
          const account =
            accountsById.get(transaction.accountId) ?? 'Conta removida';
          const destination = transaction.destinationAccountId
            ? accountsById.get(transaction.destinationAccountId)
            : undefined;

          return {
            id: transaction.id,
            description:
              transaction.description?.trim() ||
              getDefaultTransactionDescription(transaction.type),
            category,
            account:
              transaction.type === 'TRANSFER' && destination
                ? `${account} → ${destination}`
                : account,
            dateLabel: formatTransactionDate(transaction.timestamp),
            amount: transaction.amount,
            currency: transaction.currency,
            type: transaction.type,
            isRecurring: Boolean(transaction.recurrenceId),
          };
        }),
    [accountsById, categoriesById, transactions],
  );

  const changeMonth = useCallback((offset: number) => {
    setMonthOffset((current) => Math.min(current + offset, 0));
  }, []);

  const changeChartRange = useCallback((range: ChartRange) => {
    setChartRange(range);
  }, []);

  const isInitialLoading =
    !hasLoadedOnce &&
    (accountsLoading || transactionsLoading || categoriesLoading);

  const errorMessage =
    accountsError ?? transactionsError ?? categoriesError;

  return {
    activeAccounts,
    totalBalance,
    selectedMonth,
    monthLabel,
    monthOffset,
    changeMonth,
    chartRange,
    changeChartRange,
    summary,
    monthlySeries,
    categoryBreakdown,
    recentTransactions,
    isInitialLoading,
    refreshing,
    errorMessage,
    refreshDashboard,
    isCurrentMonth: monthOffset === 0,
  };
}
