import type {
  CreateCreditCardInput,
  CreditCard,
  UpdateCreditCardInput,
} from '@/services/credit-cards-api';

/** Moeda padrão aceita pelo aplicativo, alinhada ao backend. */
export const CREDIT_CARD_CURRENCY = 'BRL';
export const CREDIT_CARD_CURRENCY_LABEL = 'Real brasileiro (BRL)';

/**
 * Converte o valor monetário em centavos para comparações exatas.
 *
 * A mesma regra é usada em `utils/credit-cards`, repetida aqui para manter
 * este módulo autocontido nos testes executados diretamente pelo Node.
 */
function toCents(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 100);
}

export type CreditCardFormValues = {
  name: string;
  issuer: string;
  creditLimit: number;
  closingDay: string;
  dueDay: string;
  currency: string;
};

export const emptyCreditCardForm: CreditCardFormValues = {
  name: '',
  issuer: '',
  creditLimit: 0,
  closingDay: '',
  dueDay: '',
  currency: CREDIT_CARD_CURRENCY,
};

/** Converte o dia informado como texto em inteiro entre 1 e 31. */
export function parseCreditCardDay(value: string): number | null {
  const trimmed = value.trim();

  if (!/^\d{1,2}$/.test(trimmed)) {
    return null;
  }

  const day = Number(trimmed);

  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null;
}

/**
 * Validação compartilhada pelos formulários desktop e mobile.
 *
 * Retorna a mensagem de erro ou `null` quando os dados são válidos.
 */
export function validateCreditCardForm(
  values: CreditCardFormValues,
  options?: { committedLimit?: number },
) {
  if (!values.name.trim()) {
    return 'Informe o nome ou a identificação do cartão.';
  }

  if (!values.issuer.trim()) {
    return 'Informe a instituição emissora.';
  }

  if (!Number.isFinite(values.creditLimit) || values.creditLimit <= 0) {
    return 'Informe um limite total maior que zero.';
  }

  if (parseCreditCardDay(values.closingDay) === null) {
    return 'Informe um dia de fechamento entre 1 e 31.';
  }

  if (parseCreditCardDay(values.dueDay) === null) {
    return 'Informe um dia de vencimento entre 1 e 31.';
  }

  if (
    options?.committedLimit !== undefined &&
    toCents(values.creditLimit) < toCents(options.committedLimit)
  ) {
    return 'O limite não pode ser menor que o valor comprometido do cartão.';
  }

  return null;
}

/** Monta o corpo do POST /credit-cards. */
export function toCreateCreditCardInput(
  values: CreditCardFormValues,
): CreateCreditCardInput {
  const closingDay = parseCreditCardDay(values.closingDay);
  const dueDay = parseCreditCardDay(values.dueDay);

  if (closingDay === null || dueDay === null) {
    throw new Error('Dias de fechamento e vencimento inválidos.');
  }

  return {
    name: values.name.trim(),
    issuer: values.issuer.trim(),
    creditLimit: values.creditLimit,
    closingDay,
    dueDay,
    currency: CREDIT_CARD_CURRENCY,
  };
}

/**
 * Monta o corpo do PATCH /credit-cards/{id} apenas com os campos alterados.
 *
 * A moeda não faz parte do DTO de atualização e nunca é enviada, assim como
 * campos que permaneceram iguais aos valores já salvos.
 */
export function buildCreditCardUpdateInput(
  card: CreditCard,
  values: CreditCardFormValues,
): UpdateCreditCardInput {
  const input: UpdateCreditCardInput = {};
  const name = values.name.trim();
  const issuer = values.issuer.trim();
  const closingDay = parseCreditCardDay(values.closingDay);
  const dueDay = parseCreditCardDay(values.dueDay);

  if (name !== card.name) {
    input.name = name;
  }

  if (issuer !== card.issuer) {
    input.issuer = issuer;
  }

  if (toCents(values.creditLimit) !== toCents(card.creditLimit)) {
    input.creditLimit = values.creditLimit;
  }

  if (closingDay !== null && closingDay !== card.closingDay) {
    input.closingDay = closingDay;
  }

  if (dueDay !== null && dueDay !== card.dueDay) {
    input.dueDay = dueDay;
  }

  return input;
}
