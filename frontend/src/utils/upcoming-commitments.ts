import type { Recurrence } from '@/services/recurrences-api';

/**
 * Compromissos futuros exibidos no Dashboard.
 *
 * A única fonte real de compromissos futuros no contrato atual são as
 * recorrências ("Assinaturas"): cada uma expõe `nextOccurrence`, a data da
 * próxima cobrança. Não existem transações agendadas ou faturas projetadas no
 * backend, portanto nada além das recorrências é considerado.
 *
 * Só entram despesas ativas cuja próxima ocorrência ainda não passou; a
 * ordenação é cronológica e o `id` é o critério de desempate para manter a
 * lista estável.
 */
export const MAX_UPCOMING_COMMITMENTS = 4;

/** Data local no formato `AAAA-MM-DD`, usando o fuso do aparelho. */
function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getUpcomingCommitments(
  recurrences: Recurrence[],
  today: Date = new Date(),
  limit: number = MAX_UPCOMING_COMMITMENTS,
): Recurrence[] {
  const todayKey = localDateKey(today);
  const safeLimit =
    Number.isFinite(limit) && limit >= 0
      ? Math.floor(limit)
      : MAX_UPCOMING_COMMITMENTS;

  return recurrences
    .filter(
      (recurrence) =>
        recurrence.status === 'ACTIVE' &&
        recurrence.type === 'EXPENSE' &&
        recurrence.nextOccurrence >= todayKey,
    )
    .sort((first, second) => {
      if (first.nextOccurrence !== second.nextOccurrence) {
        return first.nextOccurrence < second.nextOccurrence ? -1 : 1;
      }

      return first.id < second.id ? -1 : first.id > second.id ? 1 : 0;
    })
    .slice(0, safeLimit);
}
