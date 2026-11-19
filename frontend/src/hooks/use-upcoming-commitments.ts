import { useMemo } from 'react';

import { recurrenceDescription } from '@/components/recurrences/recurrence-utils';
import { useRecurrences } from '@/contexts/recurrences-context';
import type { RecurrenceFrequency } from '@/services/recurrences-api';
import { getUpcomingCommitments } from '@/utils/upcoming-commitments';

export type UpcomingCommitment = {
  id: string;
  description: string;
  dueDate: string;
  amount: number;
  currency: string;
  frequency: RecurrenceFrequency;
};

/**
 * Compromissos futuros do Dashboard.
 *
 * A origem é o `RecurrencesProvider` (assinaturas/recorrências cadastradas).
 * A descrição e a data são reaproveitadas dos utilitários de recorrências para
 * não duplicar regras de apresentação.
 */
export function useUpcomingCommitments() {
  const { recurrences, loading, error, refreshRecurrences } = useRecurrences();

  const commitments = useMemo<UpcomingCommitment[]>(
    () =>
      getUpcomingCommitments(recurrences).map((recurrence) => ({
        id: recurrence.id,
        description: recurrenceDescription(recurrence),
        dueDate: recurrence.nextOccurrence,
        amount: recurrence.amount,
        currency: recurrence.currency,
        frequency: recurrence.frequency,
      })),
    [recurrences],
  );

  return {
    commitments,
    loading,
    error,
    refresh: refreshRecurrences,
  };
}
