import { apiRequest } from './api';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export type TransactionSource = 'MANUAL' | 'OPEN_FINANCE';

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: TransactionType;
  description: string | null;
  timestamp: string;
  source: TransactionSource;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
}

export interface CreateTransactionInput {
  amount: number;
  currency: string;
  type: TransactionType;
  description?: string | null;
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
}

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