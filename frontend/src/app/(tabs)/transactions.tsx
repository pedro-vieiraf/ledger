import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getTransactions,
  type Transaction as ApiTransaction,
  type TransactionType as ApiTransactionType,
} from '../../services/transactions-api';
import {
  getAccounts,
  type Account,
} from '../../services/accounts-api';
import {
  getCategories,
  type Category,
} from '../../services/categories-api';

type TransactionType = 'income' | 'expense' | 'transfer';
type FilterType = 'all' | TransactionType;

type Transaction = {
  id: string;
  description: string;
  category: string;
  account: string;
  date: string;
  amount: number;
  currency: string;
  type: TransactionType;
  icon: string;
};

const COLORS = {
  background: '#F7F7F2',
  surface: '#FFFFFF',
  primary: '#1F5B45',
  primaryLight: '#E7F0E9',
  text: '#202720',
  secondary: '#747C73',
  border: '#E7E9E2',
  income: '#27835B',
  incomeBackground: '#E8F5EC',
  expense: '#C6534B',
  expenseBackground: '#FBECE9',
  transfer: '#5474A1',
  transferBackground: '#EDF1F8',
};

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Receitas', value: 'income' },
  { label: 'Despesas', value: 'expense' },
  { label: 'Transferências', value: 'transfer' },
];

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatMonth(date: Date) {
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatDateHeading(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
  }).format(date);
}

function getTransactionColor(type: TransactionType) {
  if (type === 'income') return COLORS.income;
  if (type === 'transfer') return COLORS.transfer;
  return COLORS.expense;
}

function getTransactionBackground(type: TransactionType) {
  if (type === 'income') return COLORS.incomeBackground;
  if (type === 'transfer') return COLORS.transferBackground;
  return COLORS.expenseBackground;
}

function getAmountPrefix(type: TransactionType) {
  if (type === 'income') return '+ ';
  if (type === 'expense') return '− ';
  return '';
}

function mapTransactionType(type: ApiTransactionType): TransactionType {
  switch (type) {
    case 'INCOME':
      return 'income';
    case 'EXPENSE':
      return 'expense';
    case 'TRANSFER':
      return 'transfer';
  }
}

function getTransactionIcon(type: TransactionType) {
  if (type === 'income') return '↙';
  if (type === 'transfer') return '↔';
  return '↗';
}

function mapApiTransaction(
    transaction: ApiTransaction,
    accountsById: Map<string, Account>,
    categoriesById: Map<string, Category>,
): Transaction {
  const type = mapTransactionType(transaction.type);
  const sourceAccount = accountsById.get(transaction.accountId);
  const destinationAccount = transaction.destinationAccountId
      ? accountsById.get(transaction.destinationAccountId)
      : undefined;

  const category = transaction.categoryId
      ? categoriesById.get(transaction.categoryId)
      : undefined;

  let accountLabel = sourceAccount?.name ?? 'Conta desconhecida';

  if (type === 'transfer' && destinationAccount) {
    accountLabel = `${accountLabel} → ${destinationAccount.name}`;
  }

  return {
    id: transaction.id,
    description: transaction.description?.trim() || (
        type === 'income'
            ? 'Receita'
            : type === 'expense'
                ? 'Despesa'
                : 'Transferência'
    ),
    category: type === 'transfer'
        ? 'Transferência'
        : category?.name ?? 'Sem categoria',
    account: accountLabel,
    date: transaction.timestamp.slice(0, 10),
    amount: transaction.amount,
    currency: transaction.currency,
    type,
    icon: getTransactionIcon(type),
  };
}

function TransactionRow({
                          transaction,
                        }: {
  transaction: Transaction;
}) {
  const color = getTransactionColor(transaction.type);
  const backgroundColor = getTransactionBackground(transaction.type);

  return (
      <View style={styles.transactionRow}>
        <View style={[styles.transactionIcon, { backgroundColor }]}>
          <Text style={styles.transactionIconText}>
            {transaction.icon}
          </Text>
        </View>

        <View style={styles.transactionDetails}>
          <Text style={styles.transactionDescription} numberOfLines={1}>
            {transaction.description}
          </Text>
          <Text style={styles.transactionMeta} numberOfLines={1}>
            {transaction.category} · {transaction.account}
          </Text>
        </View>

        <Text
            style={[styles.transactionAmount, { color }]}
            numberOfLines={1}
        >
          {getAmountPrefix(transaction.type)}
          {formatCurrency(transaction.amount, transaction.currency)}
        </Text>
      </View>
  );
}

export default function TransactionsScreen() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedFilter, setSelectedFilter] =
      useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadTransactions() {
      setLoading(true);
      setError(null);

      try {
        const [apiTransactions, accounts, categories] = await Promise.all([
          getTransactions(),
          getAccounts(),
          getCategories(),
        ]);

        if (ignore) return;

        const accountsById = new Map(
            accounts.map((account) => [account.id, account]),
        );
        const categoriesById = new Map(
            categories.map((category) => [category.id, category]),
        );

        const mappedTransactions = apiTransactions
        .map((transaction) =>
            mapApiTransaction(transaction, accountsById, categoriesById),
        )
        .sort((a, b) =>
            b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
        );

        setTransactions(mappedTransactions);
      } catch (cause) {
        if (!ignore) {
          setError(
              cause instanceof Error
                  ? cause.message
                  : 'Não foi possível carregar as transações.',
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadTransactions();

    return () => {
      ignore = true;
    };
  }, []);

  const selectedMonth = useMemo(() => {
    const now = new Date();
    return new Date(
        now.getFullYear(),
        now.getMonth() + monthOffset,
        1,
    );
  }, [monthOffset]);

  const monthKey = [
    selectedMonth.getFullYear(),
    String(selectedMonth.getMonth() + 1).padStart(2, '0'),
  ].join('-');

  const monthTransactions = useMemo(
      () =>
          transactions
          .filter((transaction) => transaction.date.startsWith(monthKey))
          .sort((a, b) =>
              b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
          ),
      [transactions, monthKey],
  );

  const summary = useMemo(() => {
    return monthTransactions.reduce(
        (totals, transaction) => {
          // Os resumos atuais representam valores em uma única moeda.
          // Transações de outras moedas não devem ser somadas como se
          // fossem BRL sem uma conversão cambial explícita.
          if (transaction.currency !== 'BRL') {
            return totals;
          }

          if (transaction.type === 'income') {
            totals.income += transaction.amount;
          } else if (transaction.type === 'expense') {
            totals.expense += transaction.amount;
          } else {
            totals.transfer += transaction.amount;
          }

          return totals;
        },
        { income: 0, expense: 0, transfer: 0 },
    );
  }, [monthTransactions]);

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('pt-BR');

    return monthTransactions.filter((transaction) => {
      const matchesFilter =
          selectedFilter === 'all' ||
          transaction.type === selectedFilter;

      const searchableText = [
        transaction.description,
        transaction.category,
        transaction.account,
      ]
      .join(' ')
      .toLocaleLowerCase('pt-BR');

      return (
          matchesFilter &&
          (!normalizedQuery || searchableText.includes(normalizedQuery))
      );
    });
  }, [monthTransactions, searchQuery, selectedFilter]);

  const groupedTransactions = useMemo(() => {
    const groups: { date: string; transactions: Transaction[] }[] = [];

    for (const transaction of filteredTransactions) {
      const lastGroup = groups[groups.length - 1];

      if (lastGroup?.date === transaction.date) {
        lastGroup.transactions.push(transaction);
      } else {
        groups.push({
          date: transaction.date,
          transactions: [transaction],
        });
      }
    }

    return groups;
  }, [filteredTransactions]);

  return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>SEU DINHEIRO, EM DETALHES</Text>
              <Text style={styles.title}>Transações</Text>
            </View>

            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>R$</Text>
            </View>
          </View>

          <View style={styles.monthSelector}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mês anterior"
                onPress={() => setMonthOffset((current) => current - 1)}
                style={styles.monthArrow}
            >
              <Text style={styles.monthArrowText}>‹</Text>
            </Pressable>

            <Text style={styles.monthTitle}>
              {formatMonth(selectedMonth)}
            </Text>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Próximo mês"
                onPress={() =>
                    setMonthOffset((current) => Math.min(current + 1, 0))
                }
                disabled={monthOffset === 0}
                style={[
                  styles.monthArrow,
                  monthOffset === 0 && styles.disabledArrow,
                ]}
            >
              <Text style={styles.monthArrowText}>›</Text>
            </Pressable>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Resultado do período</Text>
            <Text
                style={[
                  styles.summaryBalance,
                  summary.income - summary.expense < 0 &&
                  styles.negativeBalance,
                ]}
            >
              {formatCurrency(summary.income - summary.expense, 'BRL')}
            </Text>
            <Text style={styles.summaryHint}>
              Receitas menos despesas, sem transferências
            </Text>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryMetrics}>
              <View style={styles.summaryMetric}>
                <View style={styles.metricHeading}>
                  <View
                      style={[
                        styles.metricDot,
                        { backgroundColor: COLORS.income },
                      ]}
                  />
                  <Text style={styles.metricLabel}>Receitas</Text>
                </View>
                <Text style={[styles.metricValue, { color: COLORS.income }]}>
                  {formatCurrency(summary.income, 'BRL')}
                </Text>
              </View>

              <View style={styles.metricSeparator} />

              <View style={styles.summaryMetric}>
                <View style={styles.metricHeading}>
                  <View
                      style={[
                        styles.metricDot,
                        { backgroundColor: COLORS.expense },
                      ]}
                  />
                  <Text style={styles.metricLabel}>Despesas</Text>
                </View>
                <Text style={[styles.metricValue, { color: COLORS.expense }]}>
                  {formatCurrency(summary.expense, 'BRL')}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.transferSummary}>
            <View style={styles.transferIcon}>
              <Text style={styles.transferIconText}>↔</Text>
            </View>
            <View style={styles.transferDetails}>
              <Text style={styles.transferTitle}>Transferências</Text>
              <Text style={styles.transferHint}>
                Movimentações entre contas
              </Text>
            </View>
            <Text style={styles.transferAmount}>
              {formatCurrency(summary.transfer, 'BRL')}
            </Text>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Histórico</Text>
            <Text style={styles.transactionCount}>
              {filteredTransactions.length}{' '}
              {filteredTransactions.length === 1
                  ? 'movimentação'
                  : 'movimentações'}
            </Text>
          </View>

          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar transação, categoria ou conta"
                placeholderTextColor={COLORS.secondary}
                style={styles.searchInput}
                returnKeyType="search"
                accessibilityLabel="Buscar transações"
            />
            {searchQuery.length > 0 && (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Limpar busca"
                    onPress={() => setSearchQuery('')}
                    hitSlop={8}
                >
                  <Text style={styles.clearSearch}>×</Text>
                </Pressable>
            )}
          </View>

          <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
          >
            {FILTERS.map((filter) => {
              const selected = selectedFilter === filter.value;

              return (
                  <Pressable
                      key={filter.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setSelectedFilter(filter.value)}
                      style={[
                        styles.filterChip,
                        selected && styles.filterChipSelected,
                      ]}
                  >
                    <Text
                        style={[
                          styles.filterText,
                          selected && styles.filterTextSelected,
                        ]}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
              );
            })}
          </ScrollView>

          {loading ? (
              <View style={styles.statusState}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.emptyDescription}>
                  Carregando transações...
                </Text>
              </View>
          ) : error ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  Não foi possível carregar as transações
                </Text>
                <Text style={styles.emptyDescription}>{error}</Text>
                <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      // A tela será recarregada ao voltar a ser montada.
                      // Para evitar depender desse comportamento de navegação,
                      // use o botão de recarregar abaixo.
                    }}
                    style={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>
                    Verifique a conexão com a API
                  </Text>
                </Pressable>
              </View>
          ) : groupedTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>⌕</Text>
                <Text style={styles.emptyTitle}>
                  Nenhuma transação encontrada
                </Text>
                <Text style={styles.emptyDescription}>
                  Tente outro filtro, outro termo de busca ou selecione um mês
                  diferente.
                </Text>
              </View>
          ) : (
              groupedTransactions.map((group) => (
                  <View key={group.date} style={styles.dateGroup}>
                    <Text style={styles.dateHeading}>
                      {formatDateHeading(group.date)}
                    </Text>

                    <View style={styles.transactionList}>
                      {group.transactions.map((transaction) => (
                          <TransactionRow
                              key={transaction.id}
                              transaction={transaction}
                          />
                      ))}
                    </View>
                  </View>
              ))
          )}

          <Text style={styles.disclaimer}>
            Dados carregados da API do Ledger. As contas não estão conectadas
            automaticamente a instituições financeiras.
          </Text>
        </ScrollView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  eyebrow: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
  },
  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  monthArrow: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthArrowText: {
    color: COLORS.text,
    fontSize: 25,
    lineHeight: 28,
  },
  disabledArrow: {
    opacity: 0.35,
  },
  monthTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  summaryLabel: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryBalance: {
    color: COLORS.primary,
    fontSize: 30,
    fontWeight: '800',
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  negativeBalance: {
    color: COLORS.expense,
  },
  summaryHint: {
    color: COLORS.secondary,
    fontSize: 11,
    marginTop: 5,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 18,
  },
  summaryMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryMetric: {
    flex: 1,
  },
  metricHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  metricDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  metricLabel: {
    color: COLORS.secondary,
    fontSize: 11,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  metricSeparator: {
    width: 1,
    height: 38,
    backgroundColor: COLORS.border,
    marginHorizontal: 18,
  },
  transferSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.transferBackground,
    borderRadius: 16,
    padding: 14,
    marginBottom: 26,
  },
  transferIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  transferIconText: {
    color: COLORS.transfer,
    fontSize: 20,
    fontWeight: '700',
  },
  transferDetails: {
    flex: 1,
  },
  transferTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  transferHint: {
    color: COLORS.secondary,
    fontSize: 10,
    marginTop: 4,
  },
  transferAmount: {
    color: COLORS.transfer,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  transactionCount: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 13,
    marginBottom: 13,
  },
  searchIcon: {
    color: COLORS.secondary,
    fontSize: 23,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
    paddingVertical: 13,
  },
  clearSearch: {
    color: COLORS.secondary,
    fontSize: 22,
    paddingLeft: 8,
  },
  filters: {
    gap: 8,
    paddingBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextSelected: {
    color: '#FFFFFF',
  },
  dateGroup: {
    marginBottom: 22,
  },
  dateHeading: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginBottom: 10,
  },
  transactionList: {
    backgroundColor: COLORS.surface,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionIconText: {
    fontSize: 18,
  },
  transactionDetails: {
    flex: 1,
    minWidth: 0,
  },
  transactionDescription: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  transactionMeta: {
    color: COLORS.secondary,
    fontSize: 10,
    marginTop: 5,
  },
  transactionAmount: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statusState: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  emptyIcon: {
    color: COLORS.primary,
    fontSize: 32,
    marginBottom: 12,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  disclaimer: {
    color: COLORS.secondary,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 16,
  },
});