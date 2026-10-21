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

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export type Transaction = ApiTransaction;

type TransactionsContextValue = {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refreshTransactions: () => Promise<void>;
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

  const refreshTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getTransactions();

      const sorted = [...data].sort(
          (a, b) =>
              new Date(b.timestamp).getTime() -
              new Date(a.timestamp).getTime(),
      );

      setTransactions(sorted);
    } catch (err) {
      const message =
          err instanceof Error
              ? err.message
              : 'Não foi possível carregar as transações.';

      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshTransactions().catch(() => {
      // O erro já está disponível no estado para a interface.
    });
  }, [refreshTransactions]);

  const value = useMemo<TransactionsContextValue>(
      () => ({
        transactions,
        loading,
        error,
        refreshTransactions,

        async createTransaction(input) {
          const created = await createTransactionRequest(input);

          await Promise.all([
            refreshTransactions(),
            refreshAccounts(),
          ]);

          return created;
        },

        async updateTransaction(id, input) {
          const updated = await updateTransactionRequest(id, input);

          await Promise.all([
            refreshTransactions(),
            refreshAccounts(),
          ]);

          return updated;
        },

        async deleteTransaction(id) {
          await deleteTransactionRequest(id);

          await Promise.all([
            refreshTransactions(),
            refreshAccounts(),
          ]);
        },
      }),
      [
        transactions,
        loading,
        error,
        refreshTransactions,
        refreshAccounts,
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
