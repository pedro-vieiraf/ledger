const amountFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Converte um valor em reais para centavos inteiros.
 * Valores negativos, inválidos ou zero são normalizados para 0.
 */
export function amountToCents(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return Math.round(amount * 100);
}

/**
 * Formata centavos como moeda brasileira.
 * Ex.: 1005 -> "R$ 10,05" (ou "10,05" sem o símbolo).
 */
export function formatCents(cents: number, showCurrencySymbol = true): string {
  const safeCents = Number.isFinite(cents) ? Math.max(0, Math.round(cents)) : 0;
  const formatted = amountFormatter.format(safeCents / 100);

  return showCurrencySymbol ? `R$ ${formatted}` : formatted;
}

/**
 * Extrai somente os dígitos de um texto e limita o tamanho.
 */
export function extractDigits(value: string, maxDigits = 12): string {
  return value.replace(/\D/g, '').slice(-maxDigits);
}
