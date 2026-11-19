import { useCallback, useMemo, useRef, useState } from 'react';

import { useAccounts } from '@/contexts/accounts-context';
import { useCreditCards } from '@/contexts/credit-cards-context';
import { useFeedback } from '@/contexts/feedback-context';
import { AmbiguousRequestError, ApiError } from '@/services/api';
import {
  getCreditCardInvoice,
  getCreditCardInvoicePayments,
  payCreditCardInvoice,
  type CreditCardInvoice,
  type CreditCardPayment,
  type CreditCardPaymentResult,
} from '@/services/credit-card-invoices-api';
import { getCreditCardPaymentErrorMessage } from '@/utils/credit-card-payment-errors';
import {
  emptyCreditCardPaymentForm,
  toPayCreditCardInvoiceInput,
  validateCreditCardPaymentForm,
  type CreditCardPaymentFormValues,
} from '@/utils/credit-card-payment-form';

type UseInvoicePaymentFormOptions = {
  cardId: string;
  invoice: CreditCardInvoice;
  /** Aplica a resposta confirmada pelo backend ao detalhe da fatura. */
  onConfirmed: (result: CreditCardPaymentResult) => void;
  /** Atualiza fatura e histórico após uma consulta de reconciliação. */
  onInvoiceUpdated: (
    invoice: CreditCardInvoice,
    payments: CreditCardPayment[],
  ) => void;
  onClose: () => void;
};

function generatePaymentId() {
  const cryptoApi = globalThis.crypto as
    | { randomUUID?: () => string }
    | undefined;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  // Fallback sem dependência nativa: UUID v4 válido para o DTO do backend.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;

    return value.toString(16);
  });
}

/**
 * Estado e envio compartilhados pelos formulários de pagamento de fatura.
 *
 * O backend suporta idempotência pelo campo `id`; o identificador é gerado
 * uma vez por abertura e reutilizado caso o usuário tente novamente. Timeouts
 * e falhas de conexão nunca disparam repetição automática: a fatura e o
 * histórico são consultados para reconciliar o estado antes de orientar o
 * usuário.
 */
export function useInvoicePaymentForm({
  cardId,
  invoice,
  onConfirmed,
  onInvoiceUpdated,
  onClose,
}: UseInvoicePaymentFormOptions) {
  const {
    accounts,
    loading: accountsLoading,
    error: accountsError,
    refreshAccounts,
  } = useAccounts();
  const { refreshCreditCards } = useCreditCards();
  const { showToast } = useFeedback();

  const [paymentId] = useState(generatePaymentId);
  const [form, setForm] = useState<CreditCardPaymentFormValues>(
    emptyCreditCardPaymentForm,
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const mutationInProgressRef = useRef(false);

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.status === 'ACTIVE'),
    [accounts],
  );

  const activeAccountIds = useMemo(
    () => activeAccounts.map((account) => account.id),
    [activeAccounts],
  );

  const fetchServerState = useCallback(async () => {
    const [details, payments] = await Promise.all([
      getCreditCardInvoice(cardId, invoice.id),
      getCreditCardInvoicePayments(cardId, invoice.id),
    ]);

    return { invoice: details.invoice, payments };
  }, [cardId, invoice.id]);

  const refreshProviders = useCallback(async () => {
    const results = await Promise.allSettled([
      refreshAccounts({ silent: true }),
      refreshCreditCards({ silent: true }),
    ]);

    return results.every((result) => result.status === 'fulfilled');
  }, [refreshAccounts, refreshCreditCards]);

  function updateField<K extends keyof CreditCardPaymentFormValues>(
    field: K,
    value: CreditCardPaymentFormValues[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError('');
  }

  function payFullAmount() {
    updateField('amount', invoice.remainingAmount);
  }

  async function handleAmbiguousResponse() {
    try {
      const state = await fetchServerState();
      const payment = state.payments.find((item) => item.id === paymentId);

      if (payment) {
        onConfirmed({ payment, invoice: state.invoice });
        const refreshed = await refreshProviders();
        showToast({
          variant: 'success',
          title: 'Pagamento confirmado',
          message: refreshed
            ? 'O backend já havia registrado o pagamento. Os dados foram atualizados.'
            : 'O backend já havia registrado o pagamento. Atualize a página para conferir o saldo da conta e o limite do cartão.',
        });
        onClose();
        return;
      }

      onInvoiceUpdated(state.invoice, state.payments);
    } catch {
      // Mantém a orientação de reconciliação abaixo.
    }

    setFormError(
      'Não foi possível confirmar se o pagamento foi concluído. Atualize a fatura e o histórico de pagamentos antes de tentar novamente.',
    );
  }

  async function handleConflict(cause: unknown) {
    try {
      const state = await fetchServerState();
      onInvoiceUpdated(state.invoice, state.payments);
      await refreshProviders();

      if (state.invoice.status === 'PAID') {
        setFormError('Esta fatura já está paga.');
        return;
      }

      if (state.invoice.status === 'OPEN') {
        setFormError(
          'Esta fatura ainda está aberta e não pode ser paga. Aguarde o fechamento.',
        );
        return;
      }

      setFormError(
        'O estado da fatura mudou. Revise o saldo restante e tente novamente.',
      );
    } catch {
      setFormError(getCreditCardPaymentErrorMessage(cause));
    }
  }

  async function save() {
    if (mutationInProgressRef.current) {
      return;
    }

    const validationError = validateCreditCardPaymentForm(form, {
      invoiceStatus: invoice.status,
      remainingAmount: invoice.remainingAmount,
      activeAccountIds,
    });

    if (validationError) {
      setFormError(validationError);
      return;
    }

    mutationInProgressRef.current = true;
    setSaving(true);
    setFormError('');

    try {
      let result: CreditCardPaymentResult;

      try {
        result = await payCreditCardInvoice(
          cardId,
          invoice.id,
          toPayCreditCardInvoiceInput(form, { id: paymentId }),
        );
      } catch (cause) {
        if (cause instanceof AmbiguousRequestError) {
          await handleAmbiguousResponse();
          return;
        }

        if (cause instanceof ApiError && cause.status === 409) {
          await handleConflict(cause);
          return;
        }

        setFormError(getCreditCardPaymentErrorMessage(cause));
        return;
      }

      // A operação já foi confirmada pelo backend. As atualizações locais e
      // dos providers não podem transformar esse sucesso em falha visual.
      onConfirmed(result);
      const refreshed = await refreshProviders();

      const paid = result.invoice.status === 'PAID';
      showToast({
        variant: 'success',
        title: paid ? 'Fatura paga' : 'Pagamento registrado',
        message: !refreshed
          ? paid
            ? 'A fatura foi quitada. Atualize a página para conferir o saldo da conta e o limite do cartão.'
            : 'O pagamento parcial foi registrado. Atualize a página para conferir o saldo da conta e o limite do cartão.'
          : paid
            ? 'A fatura foi quitada e o saldo da conta de origem foi atualizado.'
            : 'O pagamento parcial foi registrado e o saldo restante foi atualizado.',
      });

      onClose();
    } finally {
      mutationInProgressRef.current = false;
      setSaving(false);
    }
  }

  return {
    form,
    updateField,
    payFullAmount,
    activeAccounts,
    accountsLoading,
    accountsError,
    saving,
    formError,
    save,
  };
}
