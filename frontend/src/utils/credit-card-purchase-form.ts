import type { CreateCreditCardPurchaseInput } from '@/services/credit-card-purchases-api';

/** Modalidade escolhida no formulário; o backend recebe sempre um inteiro. */
export type CreditCardPurchaseModality = 'single' | 'installments';

export type CreditCardPurchaseFormValues = {
  description: string;
  /** Valor total em reais, convertido de centavos pelo `CurrencyInput`. */
  amount: number;
  /** Data da compra no formato exibido pela interface: `DD/MM/AAAA`. */
  purchaseDate: string;
  modality: CreditCardPurchaseModality;
  /** Quantidade de parcelas como texto; usada apenas quando parcelada. */
  installmentCount: string;
};

/** Quantidade máxima de dígitos aceita no campo de parcelas. */
export const MAX_INSTALLMENT_DIGITS = 2;

function toCents(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 100);
}

/**
 * Helpers de data locais para manter este módulo autocontido nos testes
 * executados diretamente pelo Node, sem depender de resolução de alias.
 */
function padNumber(value: number) {
  return String(value).padStart(2, '0');
}

function formatDateParts(date: Date) {
  return (
    `${padNumber(date.getDate())}/` +
    `${padNumber(date.getMonth() + 1)}/` +
    `${date.getFullYear()}`
  );
}

function parseLocalDate(dateValue: string): Date | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateValue.trim());

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function toIsoDate(date: Date) {
  return (
    `${date.getFullYear()}-` +
    `${padNumber(date.getMonth() + 1)}-` +
    `${padNumber(date.getDate())}`
  );
}

/**
 * Formulário vazio, com a data da compra preenchida com o dia atual.
 *
 * O valor inicial das parcelas é apenas uma sugestão de interface; a
 * distribuição real é sempre calculada pelo backend.
 */
export function createEmptyCreditCardPurchaseForm(
  today: Date = new Date(),
): CreditCardPurchaseFormValues {
  return {
    description: '',
    amount: 0,
    purchaseDate: formatDateParts(today),
    modality: 'single',
    installmentCount: '2',
  };
}

/** Converte o texto do campo de parcelas em inteiro entre 1 e 99. */
export function parseInstallmentCount(value: string): number | null {
  const trimmed = value.trim();

  if (!/^\d{1,2}$/.test(trimmed)) {
    return null;
  }

  const count = Number(trimmed);

  return Number.isInteger(count) && count >= 1 ? count : null;
}

/**
 * Validação compartilhada pelos formulários desktop e mobile.
 *
 * A regra de parcelas não pode exceder o valor em centavos reproduz a
 * restrição do domínio do backend e evita uma chamada fadada ao erro. Nenhum
 * valor de parcela é calculado aqui.
 */
export function validateCreditCardPurchaseForm(
  values: CreditCardPurchaseFormValues,
): string | null {
  if (!values.description.trim()) {
    return 'Informe a descrição da compra.';
  }

  const cents = toCents(values.amount);

  if (cents <= 0) {
    return 'Informe um valor total maior que zero.';
  }

  if (!parseLocalDate(values.purchaseDate)) {
    return 'Informe uma data de compra válida.';
  }

  if (values.modality === 'installments') {
    const installmentCount = parseInstallmentCount(values.installmentCount);

    if (installmentCount === null || installmentCount < 2) {
      return 'Informe uma quantidade de parcelas válida, de 2 a 99.';
    }

    if (installmentCount > cents) {
      return 'A quantidade de parcelas não pode ser maior que o valor da compra em centavos.';
    }
  }

  return null;
}

/**
 * Monta o corpo do `POST /credit-cards/{cardId}/purchases`.
 *
 * `installmentCount` é 1 para compras à vista. O `id` é gerado pelo cliente e
 * reutilizado em tentativas ambíguas para manter a criação idempotente.
 * `categoryId` não é enviado porque o formulário não coleta categoria e o
 * campo é opcional no DTO.
 */
export function toCreateCreditCardPurchaseInput(
  values: CreditCardPurchaseFormValues,
  options?: { id?: string },
): CreateCreditCardPurchaseInput {
  const date = parseLocalDate(values.purchaseDate);

  if (!date) {
    throw new Error('Data da compra inválida.');
  }

  const installmentCount =
    values.modality === 'single'
      ? 1
      : parseInstallmentCount(values.installmentCount);

  if (installmentCount === null || installmentCount < 1) {
    throw new Error('Quantidade de parcelas inválida.');
  }

  return {
    ...(options?.id ? { id: options.id } : {}),
    description: values.description.trim(),
    amount: values.amount,
    purchaseDate: toIsoDate(date),
    installmentCount,
  };
}
