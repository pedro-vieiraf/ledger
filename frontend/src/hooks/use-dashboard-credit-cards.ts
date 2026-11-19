import { useMemo } from 'react';

import { useCreditCards } from '@/contexts/credit-cards-context';
import {
  buildInvoiceEvolution,
  formatEvolutionPeriod,
  getOutstandingInvoiceEntries,
  getVisibleInvoiceEntries,
  summarizeInvoiceEntries,
  trimEvolutionToData,
} from '@/utils/credit-cards';

/**
 * Faturas pendentes exibidas no Dashboard.
 *
 * Reutiliza o `CreditCardsProvider`, que já mantém cartões e faturas
 * carregados, e apenas seleciona e soma os valores informados pelo backend.
 * Nenhum valor financeiro é recalculado aqui.
 */
export function useDashboardCreditCards() {
  const {
    cards,
    invoicesByCard,
    loading,
    error,
    invoicesError,
    refreshCreditCards,
  } = useCreditCards();

  const entries = useMemo(
    () => getOutstandingInvoiceEntries(cards, invoicesByCard),
    [cards, invoicesByCard],
  );

  const summary = useMemo(() => summarizeInvoiceEntries(entries), [entries]);

  const list = useMemo(() => getVisibleInvoiceEntries(entries), [entries]);

  const evolution = useMemo(() => {
    const points = buildInvoiceEvolution(entries);

    // Sem uma consulta de faturas confiável não é possível afirmar que os
    // meses zerados realmente não têm faturas, então o gráfico mostra apenas
    // o período coberto pelos valores conhecidos.
    return invoicesError ? trimEvolutionToData(points) : points;
  }, [entries, invoicesError]);

  const evolutionPeriod = useMemo(
    () => formatEvolutionPeriod(evolution),
    [evolution],
  );

  return {
    entries,
    visibleEntries: list.visible,
    hiddenInvoiceCount: list.hiddenCount,
    pendingTotal: summary.total,
    pendingCount: summary.count,
    nextDueDate: summary.nextDueDate,
    nextDueOverdue: summary.nextDueOverdue,
    evolution,
    evolutionPeriod,
    hasEvolutionData: evolution.some((point) => point.total > 0),
    loading,
    error,
    invoicesError,
    refresh: refreshCreditCards,
  };
}
