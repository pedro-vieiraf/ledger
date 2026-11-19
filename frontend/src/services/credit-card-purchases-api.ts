import { apiRequest } from './api';

export type CreditCardPurchaseStatus = 'ACTIVE' | 'CANCELLED';

export interface CreditCardInstallment {
  id: string;
  number: number;
  amount: number;
  invoiceId: string;
}

/**
 * Compra no cartão de crédito.
 *
 * A distribuição das parcelas entre as faturas é calculada pelo backend; a
 * soma das parcelas sempre corresponde ao valor total.
 */
export interface CreditCardPurchase {
  id: string;
  cardId: string;
  description: string;
  totalAmount: number;
  currency: string;
  purchaseDate: string;
  categoryId: string | null;
  installmentCount: number;
  status: CreditCardPurchaseStatus;
  createdAt: string;
  installments: CreditCardInstallment[];
}

export interface CreateCreditCardPurchaseInput {
  /**
   * Identificador gerado pelo cliente para tornar a criação idempotente.
   * Reutilize o mesmo valor ao repetir uma tentativa que falhou de forma
   * ambígua (timeout ou queda de conexão).
   */
  id?: string;
  description: string;
  amount: number;
  purchaseDate: string;
  categoryId?: string | null;
  installmentCount: number;
}

export function getCreditCardPurchases(
  cardId: string,
): Promise<CreditCardPurchase[]> {
  return apiRequest<CreditCardPurchase[]>(
    `/credit-cards/${cardId}/purchases`,
  );
}

export function getCreditCardPurchase(
  cardId: string,
  purchaseId: string,
): Promise<CreditCardPurchase> {
  return apiRequest<CreditCardPurchase>(
    `/credit-cards/${cardId}/purchases/${purchaseId}`,
  );
}

export function createCreditCardPurchase(
  cardId: string,
  input: CreateCreditCardPurchaseInput,
): Promise<CreditCardPurchase> {
  return apiRequest<CreditCardPurchase>(
    `/credit-cards/${cardId}/purchases`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  );
}

export function cancelCreditCardPurchase(
  cardId: string,
  purchaseId: string,
): Promise<CreditCardPurchase> {
  return apiRequest<CreditCardPurchase>(
    `/credit-cards/${cardId}/purchases/${purchaseId}/cancellation`,
    {
      method: 'POST',
    },
  );
}
