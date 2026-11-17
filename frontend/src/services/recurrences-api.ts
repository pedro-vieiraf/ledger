import { apiRequest } from './api';

export type RecurrenceFrequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'YEARLY';

export type RecurrenceStatus = 'ACTIVE' | 'INACTIVE';

export type RecurrenceType = 'INCOME' | 'EXPENSE';

export interface Recurrence {
  id: string;
  amount: number;
  currency: string;
  type: RecurrenceType;
  description: string | null;
  accountId: string;
  categoryId: string | null;
  frequency: RecurrenceFrequency;
  startDate: string;
  nextOccurrence: string;
  status: RecurrenceStatus;
}

export interface CreateRecurrenceInput {
  amount: number;
  currency: string;
  type: RecurrenceType;
  description?: string | null;
  accountId: string;
  categoryId?: string | null;
  frequency: RecurrenceFrequency;
  startDate: string;
}

export interface UpdateRecurrenceInput {
  amount?: number;
  description?: string | null;
  categoryId?: string;
}

export function getRecurrences(): Promise<Recurrence[]> {
  return apiRequest<Recurrence[]>('/recurrences');
}

export function getRecurrence(id: string): Promise<Recurrence> {
  return apiRequest<Recurrence>(`/recurrences/${id}`);
}

export function createRecurrence(
  input: CreateRecurrenceInput,
): Promise<Recurrence> {
  return apiRequest<Recurrence>('/recurrences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export function updateRecurrence(
  id: string,
  input: UpdateRecurrenceInput,
): Promise<Recurrence> {
  return apiRequest<Recurrence>(`/recurrences/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export function cancelRecurrence(id: string): Promise<Recurrence> {
  return apiRequest<Recurrence>(`/recurrences/${id}/cancel`, {
    method: 'POST',
  });
}

export function activateRecurrence(id: string): Promise<Recurrence> {
  return apiRequest<Recurrence>(`/recurrences/${id}/activation`, {
    method: 'POST',
  });
}

export function deleteRecurrence(id: string): Promise<void> {
  return apiRequest<void>(`/recurrences/${id}`, {
    method: 'DELETE',
  });
}
