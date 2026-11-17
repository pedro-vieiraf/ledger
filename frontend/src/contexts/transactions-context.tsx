import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAccounts } from '@/contexts/accounts-context';
import {
  createTransaction as createTransactionRequest,
  deleteTransaction as deleteTransactionRequest,
  getTransactions,
  updateTransaction as updateTransactionRequest,
  type Transaction as ApiTransaction,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from '@/services/transactions-api';
import { sortTransactionsByTimestampDescending } from '@/utils/transaction-sort';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export type Transaction = ApiTransaction;

type TransactionsContextValue = {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refreshTransactions: (options?: { silent?: boolean }) => Promise<void>;
  createTransaction: (
      input: CreateTransactionInput,
  ) => Promise<Transaction>;
  updateTransaction: (
      id: string,
      input: UpdateTransactionInput,
  ) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
};

const TransactionsContext =
    createContext<TransactionsContextValue | null>(null);

export function TransactionsProvider({
                                       children,
                                     }: {
  children: ReactNode;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { refreshAccounts } = useAccounts();

  const refreshTransactions = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }

    setError(null);

    try {
      const data = await getTransactions();

      setTransactions(sortTransactionsByTimestampDescending(data));
    } catch (err) {
      const message =
          err instanceof Error
              ? err.message
              : 'Não foi possível carregar as transações.';

      setError(message);
      throw err;
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    getTransactions()
        .then((data) => {
          if (!cancelled) {
            setTransactions(sortTransactionsByTimestampDescending(data));
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Não foi possível carregar as transações.',
            );
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });

    return () => {
      cancelled = true;
    };
  }, []);

  // A mutação já foi confirmada pelo backend; uma falha ao recarregar as
  // listas não deve fazer a tela achar que a mutação falhou.
  const refreshAfterMutation = useCallback(async () => {
    await Promise.allSettled([
      refreshTransactions(),
      refreshAccounts(),
    ]);
  }, [refreshTransactions, refreshAccounts]);

  const value = useMemo<TransactionsContextValue>(
      () => ({
        transactions,
        loading,
        error,
        refreshTransactions,

        async createTransaction(input) {
          const created = await createTransactionRequest(input);

          await refreshAfterMutation();

          return created;
        },

        async updateTransaction(id, input) {
          const updated = await updateTransactionRequest(id, input);

          await refreshAfterMutation();

          return updated;
        },

        async deleteTransaction(id) {
          await deleteTransactionRequest(id);

          await refreshAfterMutation();
        },
      }),
      [
        transactions,
        loading,
        error,
        refreshTransactions,
        refreshAfterMutation,
      ],
  );

  return (
      <TransactionsContext value={value}>
        {children}
      </TransactionsContext>
  );
}

export function useTransactions() {
  const context = useContext(TransactionsContext);

  if (!context) {
    throw new Error(
        'useTransactions must be used within a TransactionsProvider.',
    );
  }

  return context;
}
