import { apiRequest } from './api';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: TransactionType;
  description: string | null;
  timestamp: string;
  source: string;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
}

type CreateTransactionBase = {
  amount: number;
  currency: string;
  description?: string | null;
  accountId: string;
};

export type CreateTransactionInput =
  | (CreateTransactionBase & {
      type: 'INCOME' | 'EXPENSE';
      destinationAccountId?: never;
      categoryId?: string | null;
    })
  | (CreateTransactionBase & {
      type: 'TRANSFER';
      destinationAccountId: string;
      categoryId?: never;
    });

export interface UpdateTransactionInput {
  amount?: number;
  description?: string | null;
  categoryId?: string;
}

export function getTransactions(): Promise<Transaction[]> {
  return apiRequest<Transaction[]>('/transactions');
}

export function getTransaction(id: string): Promise<Transaction> {
  return apiRequest<Transaction>(`/transactions/${id}`);
}

export function createTransaction(
  input: CreateTransactionInput,
): Promise<Transaction> {
  return apiRequest<Transaction>('/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export function updateTransaction(
  id: string,
  input: UpdateTransactionInput,
): Promise<Transaction> {
  return apiRequest<Transaction>(`/transactions/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export function deleteTransaction(id: string): Promise<void> {
  return apiRequest<void>(`/transactions/${id}`, {
    method: 'DELETE',
  });
}