export type TimestampedTransaction = {
  id: string;
  timestamp: string;
};

/**
 * Compara transações da mais recente para a mais antiga usando o timestamp
 * completo (data e horário), com desempate estável pelo identificador.
 *
 * Timestamps inválidos ficam ao final da lista.
 */
export function compareTransactionsByTimestampDescending(
  first: TimestampedTransaction,
  second: TimestampedTransaction,
): number {
  const firstTime = new Date(first.timestamp).getTime();
  const secondTime = new Date(second.timestamp).getTime();
  const firstIsValid = !Number.isNaN(firstTime);
  const secondIsValid = !Number.isNaN(secondTime);

  if (firstIsValid && secondIsValid && firstTime !== secondTime) {
    return secondTime - firstTime;
  }

  if (firstIsValid !== secondIsValid) {
    return firstIsValid ? -1 : 1;
  }

  return second.id.localeCompare(first.id);
}

/**
 * Retorna uma nova lista ordenada da transação mais recente para a mais antiga.
 */
export function sortTransactionsByTimestampDescending<
  T extends TimestampedTransaction,
>(transactions: readonly T[]): T[] {
  return [...transactions].sort(compareTransactionsByTimestampDescending);
}
