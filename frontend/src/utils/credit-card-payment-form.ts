import type {
  CreditCardInvoiceStatus,
  PayCreditCardInvoiceInput,
} from '@/services/credit-card-invoices-api';

export type CreditCardPaymentFormValues = {
  accountId: string;
  /** Valor em reais, convertido de centavos pelo `CurrencyInput`. */
  amount: number;
};

export const emptyCreditCardPaymentForm: CreditCardPaymentFormValues = {
  accountId: '',
  amount: 0,
};

export type CreditCardPaymentValidationOptions = {
  invoiceStatus: CreditCardInvoiceStatus;
  remainingAmount: number;
  /** Identificadores das contas ativas exibidas no seletor. */
  activeAccountIds: readonly string[];
};

function toCents(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 100);
}

/**
 * Somente faturas fechadas ou parcialmente pagas podem receber pagamento.
 *
 * O backend também valida essa regra; aqui ela controla a disponibilidade da
 * ação e evita uma chamada fadada ao conflito.
 */
export function isInvoicePayable(status: CreditCardInvoiceStatus) {
  return status === 'CLOSED' || status === 'PARTIALLY_PAID';
}

/**
 * Validação compartilhada pelos formulários desktop e mobile.
 *
 * Nenhum saldo é recalculado: o limite superior vem de `remainingAmount`,
 * informado pelo backend. Retorna a mensagem de erro ou `null`.
 */
export function validateCreditCardPaymentForm(
  values: CreditCardPaymentFormValues,
  options: CreditCardPaymentValidationOptions,
): string | null {
  if (!isInvoicePayable(options.invoiceStatus)) {
    return 'Esta fatura não está disponível para pagamento.';
  }

  const amountCents = toCents(values.amount);

  if (amountCents <= 0) {
    return 'Informe um valor de pagamento maior que zero.';
  }

  if (!values.accountId) {
    return 'Selecione a conta bancária de origem.';
  }

  if (!options.activeAccountIds.includes(values.accountId)) {
    return 'Selecione uma conta bancária ativa.';
  }

  const remainingCents = toCents(options.remainingAmount);

  if (remainingCents <= 0) {
    return 'Esta fatura não possui saldo restante.';
  }

  if (amountCents > remainingCents) {
    return 'O pagamento não pode ser superior ao saldo restante da fatura.';
  }

  return null;
}

/**
 * Monta o corpo do `POST /credit-cards/{cardId}/invoices/{invoiceId}/payments`.
 *
 * O `id` é gerado pelo cliente e reutilizado em tentativas ambíguas; o backend
 * oferece suporte a idempotência por esse campo. Nenhum valor financeiro é
 * calculado ou ajustado aqui.
 */
export function toPayCreditCardInvoiceInput(
  values: CreditCardPaymentFormValues,
  options?: { id?: string },
): PayCreditCardInvoiceInput {
  if (!values.accountId) {
    throw new Error('Conta bancária de origem não informada.');
  }

  if (!Number.isFinite(values.amount) || values.amount <= 0) {
    throw new Error('Valor de pagamento inválido.');
  }

  return {
    ...(options?.id ? { id: options.id } : {}),
    accountId: values.accountId,
    amount: values.amount,
  };
}
