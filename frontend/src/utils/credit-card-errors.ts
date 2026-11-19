export type CreditCardOperation =
  | 'create'
  | 'update'
  | 'deactivate'
  | 'reactivate';

export const CLOSING_DAY_LOCKED_MESSAGE =
  'O dia de fechamento não pode ser alterado porque este cartão já possui faturas.';

function getHttpStatus(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;

  return typeof status === 'number' ? status : undefined;
}

/**
 * Converte erros da API de cartões em mensagens orientadas à ação.
 *
 * O backend devolve corpo vazio nos erros, então a mensagem é derivada do
 * status HTTP e da operação. O 409 da atualização corresponde ao bloqueio de
 * alteração do fechamento quando já existem faturas.
 */
export function getCreditCardErrorMessage(
  error: unknown,
  operation: CreditCardOperation,
) {
  const status = getHttpStatus(error);

  if (status !== undefined) {
    if (status === 404) {
      return 'Cartão não encontrado. Atualize a lista e tente novamente.';
    }

    if (status === 403) {
      return 'Este cartão está inativo. Reative-o para continuar.';
    }

    if (status === 409) {
      if (operation === 'update') {
        return CLOSING_DAY_LOCKED_MESSAGE;
      }

      if (operation === 'deactivate') {
        return 'O cartão não pôde ser desativado. Atualize a lista e tente novamente.';
      }

      if (operation === 'reactivate') {
        return 'O cartão não pôde ser reativado. Atualize a lista e tente novamente.';
      }

      return 'Não foi possível concluir a operação. Atualize a lista e tente novamente.';
    }

    if (status === 400) {
      return 'Verifique os dados informados e tente novamente.';
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
