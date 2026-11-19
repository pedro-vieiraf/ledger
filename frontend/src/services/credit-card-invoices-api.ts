import { apiRequest } from './api';
import type { CreditCardPurchase } from './credit-card-purchases-api';

export type CreditCardInvoiceStatus =
  | 'OPEN'
  | 'CLOSED'
  | 'PARTIALLY_PAID'
  | 'PAID';

/**
 * Fatura de cartão de crédito.
 *
 * `totalAmount`, `paidAmount`, `remainingAmount` e `status` são definidos pelo
 * backend; o frontend apenas apresenta esses valores.
 */
export interface CreditCardInvoice {
  id: string;
  cardId: string;
  cycleStart: string;
  cycleEnd: string;
  closingDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: CreditCardInvoiceStatus;
  currency: string;
}

export interface CreditCardInvoiceDetails {
  invoice: CreditCardInvoice;
  purchases: CreditCardPurchase[];
}

export interface CreditCardPayment {
  id: string;
  invoiceId: string;
  accountId: string;
  amount: number;
  currency: string;
  paidAt: string;
}

export interface PayCreditCardInvoiceInput {
  /**
   * Identificador gerado pelo cliente para tornar o pagamento idempotente.
   * Reutilize o mesmo valor ao repetir uma tentativa que falhou de forma
   * ambígua (timeout ou queda de conexão).
   */
  id?: string;
  accountId: string;
  amount: number;
}

export interface CreditCardPaymentResult {
  payment: CreditCardPayment;
  invoice: CreditCardInvoice;
}

export function getCreditCardInvoices(
  cardId: string,
): Promise<CreditCardInvoice[]> {
  return apiRequest<CreditCardInvoice[]>(`/credit-cards/${cardId}/invoices`);
}

export function getCreditCardInvoice(
  cardId: string,
  invoiceId: string,
): Promise<CreditCardInvoiceDetails> {
  return apiRequest<CreditCardInvoiceDetails>(
    `/credit-cards/${cardId}/invoices/${invoiceId}`,
  );
}

export function getCreditCardInvoicePayments(
  cardId: string,
  invoiceId: string,
): Promise<CreditCardPayment[]> {
  return apiRequest<CreditCardPayment[]>(
    `/credit-cards/${cardId}/invoices/${invoiceId}/payments`,
  );
}

export function payCreditCardInvoice(
  cardId: string,
  invoiceId: string,
  input: PayCreditCardInvoiceInput,
): Promise<CreditCardPaymentResult> {
  return apiRequest<CreditCardPaymentResult>(
    `/credit-cards/${cardId}/invoices/${invoiceId}/payments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  );
}
