import { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type TransactionType = 'income' | 'expense' | 'transfer';

type Transaction = {
  id: string;
  description: string;
  category: string;
  account: string;
  date: string;
  amount: number;
  type: TransactionType;
  icon: string;
};

type FilterType = 'all' | TransactionType;

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

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 't01',
    description: 'Salário',
    category: 'Salário',
    account: 'Conta principal',
    date: '2026-10-18',
    amount: 4200,
    type: 'income',
    icon: '💼',
  },
  {
    id: 't02',
    description: 'Supermercado',
    category: 'Alimentação',
    account: 'Conta principal',
    date: '2026-10-17',
    amount: 186.45,
    type: 'expense',
    icon: '🛒',
  },
  {
    id: 't03',
    description: 'Transferência para reserva',
    category: 'Transferência',
    account: 'Conta principal',
    date: '2026-10-16',
    amount: 500,
    type: 'transfer',
    icon: '↗',
  },
  {
    id: 't04',
    description: 'Internet',
    category: 'Moradia',
    account: 'Conta principal',
    date: '2026-10-15',
    amount: 99.9,
    type: 'expense',
    icon: '📶',
  },
  {
    id: 't05',
    description: 'Freelance',
    category: 'Trabalho',
    account: 'Conta principal',
    date: '2026-10-13',
    amount: 650,
    type: 'income',
    icon: '💻',
  },
  {
    id: 't06',
    description: 'Restaurante',
    category: 'Alimentação',
    account: 'Dinheiro',
    date: '2026-10-10',
    amount: 72.5,
    type: 'expense',
    icon: '🍽',
  },
  {
    id: 't07',
    description: 'Transporte',
    category: 'Transporte',
    account: 'Conta principal',
    date: '2026-10-08',
    amount: 45,
    type: 'expense',
    icon: '🚌',
  },
  {
    id: 't08',
    description: 'Transferência recebida',
    category: 'Transferência',
    account: 'Conta principal',
    date: '2026-10-05',
    amount: 120,
    type: 'transfer',
    icon: '↙',
  },
  {
    id: 't09',
    description: 'Streaming',
    category: 'Assinaturas',
    account: 'Cartão de crédito',
    date: '2026-10-02',
    amount: 39.9,
    type: 'expense',
    icon: '▶',
  },
  {
    id: 't10',
    description: 'Salário',
    category: 'Salário',
    account: 'Conta principal',
    date: '2026-09-18',
    amount: 4200,
    type: 'income',
    icon: '💼',
  },
  {
    id: 't11',
    description: 'Aluguel',
    category: 'Moradia',
    account: 'Conta principal',
    date: '2026-09-15',
    amount: 1200,
    type: 'expense',
    icon: '🏠',
  },
  {
    id: 't12',
    description: 'Transferência para reserva',
    category: 'Transferência',
    account: 'Conta principal',
    date: '2026-09-12',
    amount: 300,
    type: 'transfer',
    icon: '↗',
  },
  {
    id: 't13',
    description: 'Freelance',
    category: 'Trabalho',
    account: 'Conta principal',
    date: '2026-09-10',
    amount: 400,
    type: 'income',
    icon: '💻',
  },
  {
    id: 't14',
    description: 'Farmácia',
    category: 'Saúde',
    account: 'Dinheiro',
    date: '2026-09-06',
    amount: 64.8,
    type: 'expense',
    icon: '💊',
  },
];

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Receitas', value: 'income' },
  { label: 'Despesas', value: 'expense' },
  { label: 'Transferências', value: 'transfer' },
];

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatMonth(date: Date) {
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatDateHeading(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);

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

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const color = getTransactionColor(transaction.type);
  const backgroundColor = getTransactionBackground(transaction.type);

  return (
      <View style={styles.transactionRow}>
        <View style={[styles.transactionIcon, { backgroundColor }]}>
          <Text style={styles.transactionIconText}>{transaction.icon}</Text>
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
          {formatCurrency(transaction.amount)}
        </Text>
      </View>
  );
}

export default function TransactionsScreen() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedFilter, setSelectedFilter] =
      useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedMonth = useMemo(
      () => new Date(2026, 9 + monthOffset, 1),
      [monthOffset],
  );

  const monthKey = [
    selectedMonth.getFullYear(),
    String(selectedMonth.getMonth() + 1).padStart(2, '0'),
  ].join('-');

  const monthTransactions = useMemo(
      () =>
          MOCK_TRANSACTIONS.filter((transaction) =>
              transaction.date.startsWith(monthKey),
          ).sort((a, b) => b.date.localeCompare(a.date)),
      [monthKey],
  );

  const summary = useMemo(() => {
    return monthTransactions.reduce(
        (totals, transaction) => {
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

            <Text style={styles.monthTitle}>{formatMonth(selectedMonth)}</Text>

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
              {formatCurrency(summary.income - summary.expense)}
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
                  {formatCurrency(summary.income)}
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
                  {formatCurrency(summary.expense)}
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
              {formatCurrency(summary.transfer)}
            </Text>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Histórico</Text>
            <Text style={styles.transactionCount}>
              {filteredTransactions.length}{' '}
              {filteredTransactions.length === 1 ? 'movimentação' : 'movimentações'}
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

          {groupedTransactions.length === 0 ? (
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
            Dados demonstrativos. Nenhuma conta está conectada ao Ledger.
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
    fontSize: 16,
    fontWeight: '700',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  monthArrow: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthArrowText: {
    color: COLORS.primary,
    fontSize: 27,
    lineHeight: 30,
  },
  disabledArrow: {
    opacity: 0.3,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    marginBottom: 12,
  },
  summaryLabel: {
    color: '#D7E7DC',
    fontSize: 13,
    fontWeight: '500',
  },
  summaryBalance: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  negativeBalance: {
    color: '#FFD0C8',
  },
  summaryHint: {
    color: '#D7E7DC',
    fontSize: 11,
    marginTop: 5,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#527B68',
    marginVertical: 18,
  },
  summaryMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryMetric: {
    flex: 1,
    gap: 8,
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
    color: '#D7E7DC',
    fontSize: 12,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  metricSeparator: {
    width: 1,
    height: 38,
    backgroundColor: '#527B68',
    marginHorizontal: 14,
  },
  transferSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 28,
  },
  transferIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.transferBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transferIconText: {
    color: COLORS.transfer,
    fontSize: 21,
  },
  transferDetails: {
    flex: 1,
  },
  transferTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  transferHint: {
    color: COLORS.secondary,
    fontSize: 11,
    marginTop: 4,
  },
  transferAmount: {
    color: COLORS.transfer,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  transactionCount: {
    color: COLORS.secondary,
    fontSize: 11,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 13,
    minHeight: 48,
    marginBottom: 14,
  },
  searchIcon: {
    color: COLORS.secondary,
    fontSize: 24,
    marginRight: 9,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: COLORS.text,
    fontSize: 13,
    paddingVertical: 12,
  },
  clearSearch: {
    color: COLORS.secondary,
    fontSize: 23,
    paddingLeft: 8,
  },
  filters: {
    gap: 8,
    paddingBottom: 6,
    marginBottom: 18,
  },
  filterChip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 15,
    paddingVertical: 9,
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
  disclaimer: {
    color: COLORS.secondary,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 16,
  },
});