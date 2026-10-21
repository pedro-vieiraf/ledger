import { apiRequest } from './api';

export type AccountType = 'CHECKING' | 'SAVINGS';
export type AccountStatus = 'ACTIVE' | 'INACTIVE';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  status: AccountStatus;
  balance: number;
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  openingBalance: number;
  currency: string;
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
}

export function getAccounts(): Promise<Account[]> {
  return apiRequest<Account[]>('/accounts');
}

export function getAccount(id: string): Promise<Account> {
  return apiRequest<Account>(`/accounts/${id}`);
}

export function createAccount(
    input: CreateAccountInput,
): Promise<Account> {
  return apiRequest<Account>('/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export function updateAccount(
    id: string,
    input: UpdateAccountInput,
): Promise<Account> {
  return apiRequest<Account>(`/accounts/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export function deactivateAccount(id: string): Promise<void> {
  return apiRequest<void>(`/accounts/${id}`, {
    method: 'DELETE',
  });
}

export async function reactivateAccount(id: string): Promise<Account> {
  return apiRequest<Account>(`/accounts/${id}/activation`, {
    method: 'POST',
  });
}
