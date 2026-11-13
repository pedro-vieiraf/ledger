/**
 * Marcador visual usado no lugar de qualquer valor monetário quando o modo de
 * privacidade está ativo. O valor real nunca é alterado; apenas a apresentação.
 */
export const MASKED_MONEY = '••••••';

/**
 * Devolve o texto mascarado quando os valores estão ocultos e o texto original
 * caso contrário. Mantém a lógica de mascaramento em um único ponto.
 */
export function maskMoney(formatted: string, hidden: boolean) {
  return hidden ? MASKED_MONEY : formatted;
}
