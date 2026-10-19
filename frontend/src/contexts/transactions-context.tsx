import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAccounts } from '@/contexts/accounts-context';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export type Transaction = {
  id: string;
  description: string;
  category: string;
  accountId: string;
  destinationAccountId?: string;
  date: string;
  amount: number;
  type: TransactionType;
};

type CreateTransactionInput = Omit<Transaction, 'id'>;

type TransactionsContextValue = {
  transactions: Transaction[];
  createTransaction: (input: CreateTransactionInput) => void;
};

const TransactionsContext =
  createContext<TransactionsContextValue | null>(null);

export function TransactionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { accounts, adjustAccountBalance } = useAccounts();

  const value = useMemo<TransactionsContextValue>(
    () => ({
      transactions,

      createTransaction(input) {
        const description = input.description.trim();
        const category = input.category.trim();

        if (!description) {
          throw new Error('Informe a descrição da transação.');
        }

        if (!category) {
          throw new Error('Informe a categoria da transação.');
        }

        if (!Number.isFinite(input.amount) || input.amount <= 0) {
          throw new Error('O valor deve ser maior que zero.');
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
          throw new Error('Informe uma data válida no formato AAAA-MM-DD.');
        }

        const sourceAccount = accounts.find(
          (account) => account.id === input.accountId,
        );

        if (!sourceAccount) {
          throw new Error('A conta de origem não foi encontrada.');
        }

        if (sourceAccount.status !== 'ACTIVE') {
          throw new Error('A conta de origem está inativa.');
        }

        let destinationAccountId: string | undefined;

        if (input.type === 'TRANSFER') {
          if (!input.destinationAccountId) {
            throw new Error('Selecione a conta de destino.');
          }

          if (input.destinationAccountId === input.accountId) {
            throw new Error('A conta de origem e destino devem ser diferentes.');
          }

          const destinationAccount = accounts.find(
            (account) => account.id === input.destinationAccountId,
          );

          if (!destinationAccount) {
            throw new Error('A conta de destino não foi encontrada.');
          }

          if (destinationAccount.status !== 'ACTIVE') {
            throw new Error('A conta de destino está inativa.');
          }

          destinationAccountId = destinationAccount.id;
        } else if (input.destinationAccountId) {
          throw new Error(
            'Somente transferências podem ter uma conta de destino.',
          );
        }

        const normalizedAmount = Math.round(input.amount * 100) / 100;

        const transaction: Transaction = {
          ...input,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          description,
          category,
          amount: normalizedAmount,
          destinationAccountId,
        };

        if (input.type === 'INCOME') {
          adjustAccountBalance(input.accountId, normalizedAmount);
        } else if (input.type === 'EXPENSE') {
          adjustAccountBalance(input.accountId, -normalizedAmount);
        } else {
          adjustAccountBalance(input.accountId, -normalizedAmount);
          adjustAccountBalance(
            destinationAccountId!,
            normalizedAmount,
          );
        }

        setTransactions((current) => [transaction, ...current]);
      },
    }),
    [accounts, adjustAccountBalance, transactions],
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