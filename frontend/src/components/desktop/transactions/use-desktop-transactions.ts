import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { useAccounts } from '@/contexts/accounts-context';
import { useTransactions } from '@/contexts/transactions-context';
import { getCategories, type Category } from '@/services/categories-api';
import { getActiveAccounts } from '@/utils/financial-summary';
import {
  filterDesktopTransactions,
  mapDesktopTransaction,
  paginateTransactions,
  type DesktopTransaction,
  type DesktopTransactionFilters,
  type PeriodFilter,
  type TransactionTypeFilter,
} from '@/components/desktop/transactions/desktop-transactions-data';

export type DesktopTransactionsFilters = DesktopTransactionFilters;

export function useDesktopTransactions() {
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

  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [accountId, setAccountId] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
  const [type, setType] = useState<TransactionTypeFilter>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [page, setPage] = useState(1);

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

  const refreshAll = useCallback(async () => {
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
      void refreshAll();

      // O scheduler do backend pode gerar ocorrências recorrentes enquanto a
      // tela permanece aberta. Atualiza silenciosamente para mantê-las visíveis.
      const intervalId = setInterval(() => {
        void refreshTransactions({ silent: true }).catch(() => {
          // O erro já fica disponível no estado do context.
        });
      }, 15_000);

      return () => clearInterval(intervalId);
    }, [refreshAll, refreshTransactions]),
  );

  const changeQuery = useCallback((value: string) => {
    setQuery(value);
    setPage(1);
  }, []);

  const changePeriod = useCallback((value: PeriodFilter) => {
    setPeriod(value);
    setPage(1);
  }, []);

  const changeAccount = useCallback((value: string) => {
    setAccountId(value);
    setPage(1);
  }, []);

  const changeCategory = useCallback((value: string) => {
    setCategoryId(value);
    setPage(1);
  }, []);

  const changeType = useCallback((value: TransactionTypeFilter) => {
    setType(value);
    setPage(1);
  }, []);

  const changeCustomStart = useCallback((value: string) => {
    setCustomStart(value);
    setPage(1);
  }, []);

  const changeCustomEnd = useCallback((value: string) => {
    setCustomEnd(value);
    setPage(1);
  }, []);

  const activeAccounts = useMemo(() => getActiveAccounts(accounts), [accounts]);

  const accountsById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const mappedTransactions = useMemo<DesktopTransaction[]>(() => {
    const mapped = transactions.map((transaction) =>
      mapDesktopTransaction(transaction, accountsById, categoriesById),
    );

    return mapped.sort(
      (first, second) =>
        new Date(second.timestamp).getTime() -
        new Date(first.timestamp).getTime(),
    );
  }, [accountsById, categoriesById, transactions]);

  const filters = useMemo<DesktopTransactionFilters>(
    () => ({
      query,
      period,
      accountId,
      categoryId,
      type,
      customStart,
      customEnd,
    }),
    [accountId, categoryId, customEnd, customStart, period, query, type],
  );

  const filteredTransactions = useMemo(
    () => filterDesktopTransactions(mappedTransactions, filters),
    [filters, mappedTransactions],
  );

  const pagination = useMemo(
    () => paginateTransactions(filteredTransactions, page),
    [filteredTransactions, page],
  );

  const hasActiveFilters =
    query.trim() !== '' ||
    period !== 'all' ||
    accountId !== 'all' ||
    categoryId !== 'all' ||
    type !== 'all';

  const clearFilters = useCallback(() => {
    setQuery('');
    setPeriod('all');
    setAccountId('all');
    setCategoryId('all');
    setType('all');
    setCustomStart('');
    setCustomEnd('');
    setPage(1);
  }, []);

  const isInitialLoading =
    !hasLoadedOnce &&
    (accountsLoading || transactionsLoading || categoriesLoading);

  const errorMessage =
    accountsError ?? transactionsError ?? categoriesError;

  return {
    accounts,
    activeAccounts,
    categories,
    mappedTransactions,
    filteredTransactions,
    pagination,
    totalCount: mappedTransactions.length,
    isInitialLoading,
    refreshing,
    errorMessage,
    refreshAll,
    query,
    setQuery: changeQuery,
    period,
    setPeriod: changePeriod,
    accountId,
    setAccountId: changeAccount,
    categoryId,
    setCategoryId: changeCategory,
    type,
    setType: changeType,
    customStart,
    setCustomStart: changeCustomStart,
    customEnd,
    setCustomEnd: changeCustomEnd,
    hasActiveFilters,
    clearFilters,
    setPage,
  };
}
