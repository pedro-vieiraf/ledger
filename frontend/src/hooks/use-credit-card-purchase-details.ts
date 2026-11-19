import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { useCreditCards } from '@/contexts/credit-cards-context';
import { useFeedback } from '@/contexts/feedback-context';
import { ApiError } from '@/services/api';
import type { CreditCardInvoice } from '@/services/credit-card-invoices-api';
import {
  cancelCreditCardPurchase,
  getCreditCardPurchase,
  type CreditCardPurchase,
} from '@/services/credit-card-purchases-api';
import { getCreditCardPurchaseErrorMessage } from '@/utils/credit-card-purchase-errors';

function describeLoadError(cause: unknown) {
  if (cause instanceof ApiError && cause.status === 404) {
    return 'Compra não encontrada.';
  }

  return cause instanceof Error
    ? cause.message
    : 'Não foi possível carregar a compra.';
}

/**
 * Dados do detalhe de uma compra no cartão.
 *
 * O cartão e as faturas vêm do `CreditCardsProvider`; a compra e suas
 * parcelas vêm de `GET /credit-cards/{cardId}/purchases/{purchaseId}`. O
 * cancelamento atualiza o estado local com a resposta do backend e recarrega
 * cartões/faturas para refletir limite e saldos.
 */
export function useCreditCardPurchaseDetails(
  cardId: string | undefined,
  purchaseId: string | undefined,
) {
  const {
    cards,
    invoicesByCard,
    loading: cardsLoading,
    error: cardsError,
    refreshCreditCards,
  } = useCreditCards();
  const { showToast } = useFeedback();

  const [purchase, setPurchase] = useState<CreditCardPurchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const refreshInFlightRef = useRef(false);
  const mutationInProgressRef = useRef(false);

  const card = useMemo(
    () => cards.find((item) => item.id === cardId),
    [cardId, cards],
  );

  const invoicesById = useMemo(() => {
    const invoices: CreditCardInvoice[] =
      (cardId ? invoicesByCard[cardId] : undefined) ?? [];

    return new Map(invoices.map((invoice) => [invoice.id, invoice]));
  }, [cardId, invoicesByCard]);

  const installments = useMemo(
    () =>
      [...(purchase?.installments ?? [])].sort(
        (first, second) => first.number - second.number,
      ),
    [purchase],
  );

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!cardId || !purchaseId) {
        setPurchase(null);
        setError(null);
        setLoading(false);
        setHasLoadedOnce(true);
        return;
      }

      if (!options?.silent) {
        setLoading(true);
      }

      setError(null);

      try {
        const data = await getCreditCardPurchase(cardId, purchaseId);
        setPurchase(data);
      } catch (cause) {
        setError(describeLoadError(cause));
      } finally {
        setLoading(false);
        setHasLoadedOnce(true);
      }
    },
    [cardId, purchaseId],
  );

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;
    setRefreshing(true);

    await Promise.allSettled([
      refreshCreditCards({ silent: true }),
      load({ silent: true }),
    ]);

    refreshInFlightRef.current = false;
    setRefreshing(false);
  }, [load, refreshCreditCards]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const cancelPurchase = useCallback(async () => {
    if (
      mutationInProgressRef.current ||
      !cardId ||
      !purchaseId ||
      !purchase ||
      purchase.status === 'CANCELLED'
    ) {
      return false;
    }

    mutationInProgressRef.current = true;
    setCancelling(true);
    setCancelError(null);

    try {
      const cancelled = await cancelCreditCardPurchase(cardId, purchaseId);
      setPurchase(cancelled);

      await refreshCreditCards({ silent: true }).catch(() => {
        // As faturas e o limite serão atualizados no próximo foco caso a
        // recarga falhe agora.
      });

      showToast({
        variant: 'success',
        title: 'Compra cancelada',
        message:
          'As parcelas foram removidas das faturas abertas e o histórico da compra foi preservado.',
      });

      return true;
    } catch (cause) {
      // Um cancelamento repetido ou uma tentativa concorrente pode devolver
      // 409 mesmo com a compra já cancelada. Confirma o estado real antes de
      // exibir erro.
      try {
        const fresh = await getCreditCardPurchase(cardId, purchaseId);
        setPurchase(fresh);

        if (fresh.status === 'CANCELLED') {
          await refreshCreditCards({ silent: true }).catch(() => {});
          showToast({
            variant: 'info',
            title: 'Compra já cancelada',
            message: 'O estado da compra já estava atualizado.',
          });
          return true;
        }
      } catch {
        // Mantém o erro original quando não é possível confirmar o estado.
      }

      setCancelError(getCreditCardPurchaseErrorMessage(cause, 'cancel'));
      return false;
    } finally {
      mutationInProgressRef.current = false;
      setCancelling(false);
    }
  }, [
    cardId,
    purchase,
    purchaseId,
    refreshCreditCards,
    showToast,
  ]);

  return {
    card,
    purchase,
    installments,
    invoicesById,
    cardsLoading,
    cardsError,
    loading,
    error,
    hasLoadedOnce,
    refreshing,
    refresh,
    cancelling,
    cancelError,
    cancelPurchase,
    clearCancelError: () => setCancelError(null),
  };
}
