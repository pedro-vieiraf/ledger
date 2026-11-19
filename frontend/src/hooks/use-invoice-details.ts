import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { useAccounts } from '@/contexts/accounts-context';
import { useCreditCards } from '@/contexts/credit-cards-context';
import { ApiError } from '@/services/api';
import {
  getCreditCardInvoice,
  getCreditCardInvoicePayments,
  type CreditCardInvoice,
  type CreditCardInvoiceDetails,
  type CreditCardPayment,
  type CreditCardPaymentResult,
} from '@/services/credit-card-invoices-api';
import { sortPaymentsByPaidAtDescending } from '@/utils/credit-cards';

function describeLoadError(cause: unknown, fallback: string) {
  if (cause instanceof ApiError && cause.status === 404) {
    return 'Fatura não encontrada.';
  }

  return cause instanceof Error ? cause.message : fallback;
}

/**
 * Dados do detalhe de uma fatura.
 *
 * A identificação do cartão vem do `CreditCardsProvider`; a fatura e suas
 * compras vêm de `GET /credit-cards/{cardId}/invoices/{invoiceId}` e os
 * pagamentos de `GET /credit-cards/{cardId}/invoices/{invoiceId}/payments`.
 * Os dois endpoints são consultados em paralelo, uma vez por foco da tela.
 */
export function useInvoiceDetails(
  cardId: string | undefined,
  invoiceId: string | undefined,
) {
  const {
    cards,
    invoicesByCard,
    loading: cardsLoading,
    error: cardsError,
  } = useCreditCards();
  const { accounts } = useAccounts();

  const [details, setDetails] = useState<CreditCardInvoiceDetails | null>(
    null,
  );
  const [invoiceOverride, setInvoiceOverride] =
    useState<CreditCardInvoice | null>(null);
  const [payments, setPayments] = useState<CreditCardPayment[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refreshInFlightRef = useRef(false);

  const card = useMemo(
    () => cards.find((item) => item.id === cardId),
    [cardId, cards],
  );

  /**
   * Fatura conhecida pelo provider. Serve como resumo imediato enquanto o
   * detalhe completo (com as compras) ainda está sendo carregado.
   */
  const contextInvoice = useMemo(() => {
    if (!cardId || !invoiceId) {
      return undefined;
    }

    return invoicesByCard[cardId]?.find(
      (invoice) => invoice.id === invoiceId,
    );
  }, [cardId, invoiceId, invoicesByCard]);

  const invoice = details?.invoice ?? invoiceOverride ?? contextInvoice;
  const purchases = useMemo(() => details?.purchases ?? [], [details]);

  const sortedPayments = useMemo(
    () => sortPaymentsByPaidAtDescending(payments),
    [payments],
  );

  const accountNamesById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!cardId || !invoiceId) {
        setDetails(null);
        setInvoiceOverride(null);
        setPayments([]);
        setInvoiceError(null);
        setPaymentsError(null);
        setInvoiceLoading(false);
        setPaymentsLoading(false);
        setHasLoadedOnce(true);
        return;
      }

      if (!options?.silent) {
        setInvoiceLoading(true);
        setPaymentsLoading(true);
      }

      setInvoiceError(null);
      setPaymentsError(null);

      const [detailsResult, paymentsResult] = await Promise.allSettled([
        getCreditCardInvoice(cardId, invoiceId),
        getCreditCardInvoicePayments(cardId, invoiceId),
      ]);

      if (detailsResult.status === 'fulfilled') {
        setDetails(detailsResult.value);
        setInvoiceOverride(null);
      } else {
        setInvoiceError(
          describeLoadError(
            detailsResult.reason,
            'Não foi possível carregar a fatura.',
          ),
        );
      }

      if (paymentsResult.status === 'fulfilled') {
        setPayments(paymentsResult.value);
      } else {
        setPaymentsError(
          describeLoadError(
            paymentsResult.reason,
            'Não foi possível carregar os pagamentos.',
          ),
        );
      }

      setInvoiceLoading(false);
      setPaymentsLoading(false);
      setHasLoadedOnce(true);
    },
    [cardId, invoiceId],
  );

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;
    setRefreshing(true);

    try {
      await load({ silent: true });
    } finally {
      refreshInFlightRef.current = false;
      setRefreshing(false);
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  /**
   * Aplica a resposta confirmada do pagamento sem recarregar a fatura.
   *
   * A fatura e o pagamento vêm do backend; nenhum saldo é recalculado. A
   * listagem de pagamentos é atualizada sem duplicar o mesmo identificador.
   */
  const applyPaymentResult = useCallback((result: CreditCardPaymentResult) => {
    setInvoiceOverride(result.invoice);
    setDetails((current) =>
      current ? { ...current, invoice: result.invoice } : current,
    );
    setPayments((current) =>
      current.some((payment) => payment.id === result.payment.id)
        ? current
        : [result.payment, ...current],
    );
  }, []);

  /**
   * Atualiza a fatura e, opcionalmente, o histórico após uma consulta de
   * reconciliação. Usado quando o backend rejeita por conflito de estado.
   */
  const applyInvoiceSnapshot = useCallback(
    (nextInvoice: CreditCardInvoice, nextPayments?: CreditCardPayment[]) => {
      setInvoiceOverride(nextInvoice);
      setDetails((current) =>
        current ? { ...current, invoice: nextInvoice } : current,
      );

      if (nextPayments) {
        setPayments(nextPayments);
      }
    },
    [],
  );

  return {
    card,
    invoice,
    purchases,
    payments: sortedPayments,
    accountNamesById,
    cardsLoading,
    cardsError,
    invoiceLoading,
    invoiceError,
    paymentsLoading,
    paymentsError,
    refreshing,
    hasLoadedOnce,
    refresh,
    applyPaymentResult,
    applyInvoiceSnapshot,
  };
}
