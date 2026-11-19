import { apiRequest } from './api';

export type CreditCardStatus = 'ACTIVE' | 'INACTIVE';

/**
 * Cartão de crédito conforme retornado pelo backend.
 *
 * `availableLimit` é calculado e enviado pelo backend; o frontend nunca
 * recalcula o limite disponível.
 */
export interface CreditCard {
  id: string;
  name: string;
  issuer: string;
  creditLimit: number;
  availableLimit: number;
  closingDay: number;
  dueDay: number;
  status: CreditCardStatus;
  currency: string;
}

export interface CreateCreditCardInput {
  name: string;
  issuer: string;
  creditLimit: number;
  closingDay: number;
  dueDay: number;
  currency: string;
}

export interface UpdateCreditCardInput {
  name?: string;
  issuer?: string;
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
}

export function getCreditCards(): Promise<CreditCard[]> {
  return apiRequest<CreditCard[]>('/credit-cards');
}

export function getCreditCard(id: string): Promise<CreditCard> {
  return apiRequest<CreditCard>(`/credit-cards/${id}`);
}

export function createCreditCard(
  input: CreateCreditCardInput,
): Promise<CreditCard> {
  return apiRequest<CreditCard>('/credit-cards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export function updateCreditCard(
  id: string,
  input: UpdateCreditCardInput,
): Promise<CreditCard> {
  return apiRequest<CreditCard>(`/credit-cards/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export function deactivateCreditCard(id: string): Promise<void> {
  return apiRequest<void>(`/credit-cards/${id}`, {
    method: 'DELETE',
  });
}

export function reactivateCreditCard(id: string): Promise<CreditCard> {
  return apiRequest<CreditCard>(`/credit-cards/${id}/activation`, {
    method: 'POST',
  });
}
