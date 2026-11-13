import type { AccountType } from '@/services/accounts-api';

/** Rótulos de exibição para os tipos de conta aceitos pelo backend. */
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: 'Conta corrente',
  SAVINGS: 'Poupança',
};

export type AccountFormValues = {
  name: string;
  type: AccountType;
  openingBalance: number;
};

export const emptyAccountForm: AccountFormValues = {
  name: '',
  type: 'CHECKING',
  openingBalance: 0,
};

export function formatAccountType(type: AccountType) {
  return ACCOUNT_TYPE_LABELS[type] ?? type;
}

/**
 * Validação do formulário de conta, compartilhada entre mobile e desktop.
 * Retorna a mensagem de erro ou `null` quando os dados são válidos.
 */
export function validateAccountForm(
  values: AccountFormValues,
  options: { isEditing: boolean },
) {
  if (!values.name.trim()) {
    return 'Informe o nome da conta.';
  }

  if (
    !options.isEditing &&
    (!Number.isFinite(values.openingBalance) || values.openingBalance < 0)
  ) {
    return 'Informe um saldo inicial válido.';
  }

  return null;
}
