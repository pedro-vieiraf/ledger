function getHttpStatus(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;

  return typeof status === 'number' ? status : undefined;
}

/**
 * Mensagens orientadas à ação para o pagamento de fatura.
 *
 * O backend responde com corpo vazio, então a mensagem é derivada do status
 * HTTP:
 * - 400: valor inválido, acima do saldo restante ou moeda incompatível;
 * - 403: conta de origem inativa;
 * - 404: cartão, fatura ou conta inexistente;
 * - 409: conflito de estado (fatura OPEN/PAID ou alteração concorrente).
 *
 * O hook de pagamento refina o 409 consultando novamente a fatura, pois o
 * backend não detalha a causa no corpo da resposta.
 */
export function getCreditCardPaymentErrorMessage(error: unknown) {
  const status = getHttpStatus(error);

  if (status !== undefined) {
    if (status === 400) {
      return 'Não foi possível processar o pagamento. Verifique o valor, o saldo restante da fatura e a moeda da conta selecionada.';
    }

    if (status === 403) {
      return 'A conta selecionada está inativa ou não pode ser usada como origem do pagamento.';
    }

    if (status === 404) {
      return 'Cartão, fatura ou conta não encontrada. Atualize os dados e tente novamente.';
    }

    if (status === 409) {
      return 'O estado da fatura mudou e o pagamento não pôde ser concluído. Atualize os dados e tente novamente.';
    }

    if (status >= 500) {
      return 'O servidor não conseguiu concluir o pagamento. Tente novamente em instantes.';
    }

    return 'Não foi possível concluir o pagamento. Tente novamente.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Não foi possível concluir o pagamento. Tente novamente.';
}
