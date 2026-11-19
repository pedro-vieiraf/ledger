export type CreditCardPurchaseOperation = 'create' | 'cancel';

function getHttpStatus(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;

  return typeof status === 'number' ? status : undefined;
}

/**
 * Mensagens orientadas à ação para as operações de compra no cartão.
 *
 * O backend responde com corpo vazio, então a mensagem é derivada do status
 * HTTP e da operação:
 * - 403: cartão inativo ao registrar compra;
 * - 409: limite insuficiente/regra de negócio ou cancelamento não permitido
 *   (inclusive compra já cancelada).
 */
export function getCreditCardPurchaseErrorMessage(
  error: unknown,
  operation: CreditCardPurchaseOperation,
) {
  const status = getHttpStatus(error);

  if (status !== undefined) {
    if (status === 404) {
      return operation === 'cancel'
        ? 'Compra não encontrada. Atualize a página e tente novamente.'
        : 'Cartão não encontrado. Atualize a lista e tente novamente.';
    }

    if (status === 403) {
      return 'Este cartão está inativo. Reative-o para registrar novas compras.';
    }

    if (status === 409) {
      return operation === 'cancel'
        ? 'A compra não pode ser cancelada. Todas as faturas precisam estar abertas e sem pagamentos.'
        : 'Não foi possível registrar a compra. Verifique o limite disponível do cartão e tente novamente.';
    }

    if (status === 400) {
      return operation === 'cancel'
        ? 'A solicitação de cancelamento não pôde ser processada. Atualize a página e tente novamente.'
        : 'Verifique os dados da compra e tente novamente.';
    }

    if (status >= 500) {
      return 'O servidor não conseguiu concluir a operação. Tente novamente em instantes.';
    }

    return 'Não foi possível concluir a operação. Tente novamente.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Não foi possível concluir a operação. Tente novamente.';
}
