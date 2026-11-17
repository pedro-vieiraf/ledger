import type { Account } from '@/services/accounts-api';
import type { Transaction } from '@/services/transactions-api';

export type FinancialSummary = {
  income: number;
  expense: number;
  result: number;
};

/** Converte um valor monetário em centavos inteiros. */
export function toCents(value: number): number {
  return Math.round(value * 100);
}

/** Retorna somente as contas ativas. */
export function getActiveAccounts(accounts: Account[]): Account[] {
  return accounts.filter((account) => account.status === 'ACTIVE');
}

/** Soma os saldos das contas informadas, em reais. */
export function sumAccountBalances(accounts: Account[]): number {
  return (
    accounts.reduce(
      (total, account) => total + toCents(account.balance),
      0,
    ) / 100
  );
}

/** Filtra as transações de um mês, no fuso local. */
export function filterTransactionsByMonth(
  transactions: Transaction[],
  month: Date,
): Transaction[] {
  return transactions.filter((transaction) => {
    const date = new Date(transaction.timestamp);

    return (
      !Number.isNaN(date.getTime()) &&
      date.getFullYear() === month.getFullYear() &&
      date.getMonth() === month.getMonth()
    );
  });
}

/**
 * Calcula receitas, despesas e resultado de um conjunto de transações.
 * Transferências não entram no resumo financeiro.
 */
export function summarizeTransactions(
  transactions: Transaction[],
): FinancialSummary {
  let incomeCents = 0;
  let expenseCents = 0;

  for (const transaction of transactions) {
    if (transaction.currency !== 'BRL') {
      continue;
    }

    const cents = toCents(transaction.amount);

    if (transaction.type === 'INCOME') {
      incomeCents += cents;
    } else if (transaction.type === 'EXPENSE') {
      expenseCents += cents;
    }
  }

  return {
    income: incomeCents / 100,
    expense: expenseCents / 100,
    result: (incomeCents - expenseCents) / 100,
  };
}
