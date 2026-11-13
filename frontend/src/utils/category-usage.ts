import type { Category } from '@/services/categories-api';
import type { TransactionType } from '@/services/transactions-api';

export type CategoryUsage = {
  income: boolean;
  expense: boolean;
};

type UsageTransaction = {
  type: TransactionType;
  categoryId: string | null;
};

/**
 * Deriva, a partir das transações reais, em quais tipos cada categoria é usada.
 * Transferências não entram no agrupamento de receitas/despesas.
 */
export function buildCategoryUsage(
  transactions: UsageTransaction[],
): Map<string, CategoryUsage> {
  const usage = new Map<string, CategoryUsage>();

  for (const transaction of transactions) {
    if (!transaction.categoryId) {
      continue;
    }

    if (transaction.type !== 'INCOME' && transaction.type !== 'EXPENSE') {
      continue;
    }

    const current = usage.get(transaction.categoryId) ?? {
      income: false,
      expense: false,
    };

    if (transaction.type === 'INCOME') {
      current.income = true;
    } else {
      current.expense = true;
    }

    usage.set(transaction.categoryId, current);
  }

  return usage;
}

/**
 * Separa as categorias em receitas, despesas e sem uso. Uma categoria usada
 * nos dois tipos aparece nas duas seções, sem alterar os dados de origem.
 */
export function groupCategoriesByUsage(
  categories: Category[],
  usage: Map<string, CategoryUsage>,
) {
  return {
    income: categories.filter((category) => usage.get(category.id)?.income),
    expense: categories.filter((category) => usage.get(category.id)?.expense),
    unused: categories.filter((category) => !usage.has(category.id)),
  };
}
