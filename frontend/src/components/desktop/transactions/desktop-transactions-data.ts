import type { Account } from '@/services/accounts-api';
import type { Category } from '@/services/categories-api';
import type {
  Transaction as ApiTransaction,
  TransactionType,
} from '@/services/transactions-api';
import { formatDateParts, formatTimeParts } from '@/utils/date-time';
import { getDefaultTransactionDescription } from '@/components/desktop/desktop-format';

export * from '@/utils/desktop-transaction-filters';

export type DesktopTransaction = {
  id: string;
  description: string;
  category: string;
  categoryId: string | null;
  accountId: string;
  destinationAccountId: string | null;
  accountLabel: string;
  dateLabel: string;
  timeLabel: string;
  timestamp: string;
  amount: number;
  currency: string;
  type: TransactionType;
  isRecurring: boolean;
  source: ApiTransaction['source'];
};

export function mapDesktopTransaction(
  transaction: ApiTransaction,
  accountsById: Map<string, Account>,
  categoriesById: Map<string, Category>,
): DesktopTransaction {
  const date = new Date(transaction.timestamp);
  const hasValidDate = !Number.isNaN(date.getTime());
  const sourceAccount =
    accountsById.get(transaction.accountId)?.name ?? 'Conta removida';
  const destinationAccount = transaction.destinationAccountId
    ? accountsById.get(transaction.destinationAccountId)?.name ??
      'Conta removida'
    : null;

  const category =
    transaction.type === 'TRANSFER'
      ? 'Transferência'
      : transaction.categoryId
        ? categoriesById.get(transaction.categoryId)?.name ??
          'Categoria removida'
        : 'Sem categoria';

  return {
    id: transaction.id,
    description:
      transaction.description?.trim() ||
      getDefaultTransactionDescription(transaction.type),
    category,
    categoryId: transaction.categoryId,
    accountId: transaction.accountId,
    destinationAccountId: transaction.destinationAccountId,
    accountLabel:
      transaction.type === 'TRANSFER' && destinationAccount
        ? `${sourceAccount} → ${destinationAccount}`
        : sourceAccount,
    dateLabel: hasValidDate ? formatDateParts(date) : '—',
    timeLabel: hasValidDate ? formatTimeParts(date) : '',
    timestamp: transaction.timestamp,
    amount: transaction.amount,
    currency: transaction.currency,
    type: transaction.type,
    isRecurring: Boolean(transaction.recurrenceId),
    source: transaction.source,
  };
}
