import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { useCreditCards } from '@/contexts/credit-cards-context';
import { getCategories, type Category } from '@/services/categories-api';
import {
  getCreditCardPurchases,
  type CreditCardPurchase,
} from '@/services/credit-card-purchases-api';
import {
  findCurrentInvoice,
  findOutstandingInvoice,
  sortInvoicesChronologically,
} from '@/utils/credit-cards';

/**
 * Dados do detalhe de um cartão.
 *
 * Cartões e faturas vêm do `CreditCardsProvider`, que já consulta
 * `GET /credit-cards` e `GET /credit-cards/{id}/invoices`; a listagem de
 * compras e as categorias são carregadas aqui, uma vez por foco da tela.
 */
export function useCreditCardDetails(cardId: string | undefined) {
  const {
    cards,
    invoicesByCard,
    loading,
    error,
    invoicesError,
    refreshCreditCards,
  } = useCreditCards();

  const [purchases, setPurchases] = useState<CreditCardPurchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [purchasesError, setPurchasesError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refreshInFlightRef = useRef(false);

  const card = useMemo(
    () => cards.find((item) => item.id === cardId),
    [cardId, cards],
  );

  const invoices = useMemo(
    () =>
      cardId ? sortInvoicesChronologically(invoicesByCard[cardId] ?? []) : [],
    [cardId, invoicesByCard],
  );

  /**
   * Fatura em destaque: a atual em aberto ou, na falta dela, a pendente mais
   * antiga com saldo restante. O destaque é apenas visual.
   */
  const highlightedInvoice = useMemo(
    () => findCurrentInvoice(invoices) ?? findOutstandingInvoice(invoices),
    [invoices],
  );

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const loadPurchases = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!cardId) {
        setPurchases([]);
        setPurchasesLoading(false);
        return;
      }

      if (!options?.silent) {
        setPurchasesLoading(true);
      }

      setPurchasesError(null);

      try {
        const [purchasesData, categoriesData] = await Promise.all([
          getCreditCardPurchases(cardId),
          // A categoria é apenas informativa: uma falha aqui não impede a
          // exibição das compras.
          getCategories().catch(() => [] as Category[]),
        ]);

        setPurchases(purchasesData);
        setCategories(categoriesData);
      } catch (cause) {
        setPurchasesError(
          cause instanceof Error
            ? cause.message
            : 'Não foi possível carregar as compras do cartão.',
        );
      } finally {
        setPurchasesLoading(false);
      }
    },
    [cardId],
  );

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;
    setRefreshing(true);

    await Promise.allSettled([
      refreshCreditCards({ silent: true }),
      loadPurchases({ silent: true }),
    ]);

    refreshInFlightRef.current = false;
    setRefreshing(false);
    setHasLoadedOnce(true);
  }, [loadPurchases, refreshCreditCards]);

  /** Recarrega apenas as compras, sem alterar o estado de atualização da tela. */
  const reloadPurchases = useCallback(async () => {
    await loadPurchases({ silent: true });
  }, [loadPurchases]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return {
    card,
    invoices,
    highlightedInvoice,
    purchases,
    categoriesById,
    loading,
    error,
    invoicesError,
    purchasesLoading,
    purchasesError,
    refreshing,
    hasLoadedOnce,
    refresh,
    reloadPurchases,
  };
}
